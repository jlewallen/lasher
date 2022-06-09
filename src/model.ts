import _ from "lodash";
import dateformat from "dateformat";
// import * as variableDiff from "variable-diff";

interface TransactionResponse {
  date: string;
  payee: string;
  cleared: boolean;
  note: string;
  postings: { account: string; value: number; note: string }[];
  mid: string;
}

type TransactionsResponse = TransactionResponse[];

class Posting {
  constructor(
    public readonly account: string,
    public readonly value: number,
    public readonly note: string
  ) {}
}

class Transaction {
  constructor(
    public readonly date: Date,
    public readonly payee: string,
    public readonly cleared: boolean,
    public readonly note: string,
    public readonly postings: Posting[],
    public readonly mid: string | undefined = undefined
  ) {}

  get prettyDate(): string {
    return dateformat(this.date, "yyyy/mm/dd");
  }

  get prettyPayee(): string {
    return this.payee.replace(/#\S+#/, "");
  }

  get allReferences(): string[] {
    const m = /#(\S+)#/.exec(this.payee);
    return m ? m[1].split(",") : [];
  }

  get references(): string[] {
    return this.allReferences.filter((mid) => mid.indexOf("_") < 0);
  }

  tagged(tag: string): boolean {
    return _.some(this.postings.filter((p) => p.note.indexOf(tag) >= 0));
  }

  resolvePaidFrom(): Posting | null {
    const negative = this.postings.filter((p) => p.value < 0);
    const allocations = negative.filter((p) =>
      p.account.startsWith("allocations:")
    );
    if (allocations.length == 1) {
      return allocations[0];
    }

    const getRanking = (account: string) => {
      const sourceRankings = [
        { re: new RegExp("main$"), rank: -1 },
        { re: new RegExp("core$"), rank: -1 },
        { re: new RegExp("^assets:"), rank: -2 },
        { re: new RegExp("^liabilities:"), rank: -2 },
        { re: new RegExp("^expenses:"), rank: -3 },
      ];
      const matches = sourceRankings.filter((r) => r.re.test(account));
      if (matches.length > 0) {
        return matches[0].rank;
      }
      return 0;
    };

    const byPath = _.groupBy(this.postings, (p: Posting) => p.account);
    const differencesByPath = _.values(
      _.mapValues(byPath, (g: Posting[], account: string) => {
        return {
          account: account,
          value: _.sum(g.map((p: Posting) => p.value)),
        };
      })
    );
    const ranked = _.reverse(
      _.sortBy(differencesByPath, (d) => getRanking(d.account))
    );

    return ranked[0];
  }

  posting(predicate: (n: string) => boolean): Posting | null {
    const matching = this.postings.filter((p) => predicate(p.account));
    if (matching.length == 1) {
      return matching[0];
    }
    return null;
  }
}

export class TimeWindow {
  constructor(public readonly start: Date, public readonly end: Date) {}

  public scaledWeekly(value: number): number {
    const elapsed = this.end.getTime() - this.start.getTime();
    const oneWeek = 24 * 3600 * 1000 * 7;
    const weeks = elapsed / oneWeek;
    return value / weeks;
  }
}

class Balances {
  constructor(public readonly balances: { [index: string]: number }) {}

  absolute(): Balances {
    return new Balances(
      _.mapValues(this.balances, (value: number) => Math.abs(value))
    );
  }

  single(): number {
    const keys = Object.keys(this.balances);
    if (keys.length > 1) {
      throw new Error("unable to return single balance from multiple");
    }
    if (keys.length == 1) {
      return this.balances[keys[0]];
    }
    return 0;
  }
}

type MapTransactionFn = (t: Transaction) => Transaction[];

class Transactions {
  readonly byMid_: { [index: string]: Transaction };
  readonly references_: { [index: string]: Transaction[] };

  constructor(public readonly transactions: Transaction[]) {
    this.byMid_ = _(transactions.map((tx) => [tx.mid, tx]));
    this.references_ = _(
      transactions.map((tx) =>
        tx.references.map((reference) => {
          return {
            mid: reference,
            tx: tx,
          };
        })
      )
    )
      .flatten()
      .groupBy((row: { mid: string; tx: Transaction }) => row.mid)
      .mapValues((rows: { mid: string; tx: Transaction }[]) =>
        rows.map((row) => row.tx)
      )
      .value();
  }

  get timeWindow(): TimeWindow {
    const dates = this.transactions.map((t) => t.date);
    const min = _.min(dates);
    const max = _.max(dates);
    return new TimeWindow(min, max);
  }

  static build(data: TransactionsResponse): Transactions {
    return new Transactions(
      data.map((row) => {
        const postings = row.postings.map((postingRow) => {
          return new Posting(
            postingRow.account,
            postingRow.value,
            postingRow.note
          );
        });
        return new Transaction(
          new Date(row.date),
          row.payee,
          row.cleared,
          row.note,
          postings,
          row.mid
        );
      })
    );
  }

  references(mid: string): Transaction[] {
    if (this.references_[mid]) {
      return this.references_[mid];
    }
    return [];
  }

  find(mids: string[]): Transaction[] {
    return mids.map((mid) => this.byMid_[mid]).filter((maybe) => maybe);
  }

  excludeTagged(tag: string): Transactions {
    return this.filter((t) => {
      return !t.tagged(tag);
    });
  }

  excluding(predicate: (t: Transaction) => boolean): Transactions {
    return this.filter((tx) => {
      return !predicate(tx);
    });
  }

  filter(predicate: (t: Transaction) => boolean): Transactions {
    return new Transactions(this.transactions.filter(predicate));
  }

  map(fn: MapTransactionFn): Transactions {
    return new Transactions(_.flatten(this.transactions.map(fn)));
  }

  monthly(): GroupedTransactions {
    return new GroupedTransactions(
      _.mapValues(
        _.groupBy(this.transactions, (t: Transaction): string => {
          return dateformat(t.date, "yyyy-mm");
        }),
        (txs: Transaction[]) => new Transactions(txs)
      )
    );
  }

  balances(): Balances {
    const allPostings = _.flatten(this.transactions.map((t) => t.postings));
    const byPath = _.groupBy(allPostings, (p: Posting) => p.account);
    const totals = _.mapValues(byPath, (postings: Posting[]) => {
      return _.sum(postings.map((p) => p.value));
    });
    return new Balances(totals);
  }

  balance(): number {
    const balances = this.balances();
    return balances.single();
  }
}

type TransactionsMap = { [index: string]: Transactions };

type BalancesMap = { [index: string]: Balances };

class GroupedTransactions {
  constructor(public readonly transactions: TransactionsMap) {}

  balances(): BalancesMap {
    return _.mapValues(this.transactions, (txs: Transactions) => {
      return txs.balances();
    });
  }
}

function transactionsMatchingPath(
  patterns: string[],
  options: { excludeOtherPostings: boolean } = { excludeOtherPostings: true }
): MapTransactionFn {
  const expressions = patterns.map((p) => new RegExp(p));
  return (t: Transaction): Transaction[] => {
    const postings = _.flatten(
      expressions.map((re) => t.postings.filter((p) => re.test(p.account)))
    );
    if (postings.length > 0) {
      if (options.excludeOtherPostings) {
        return [
          new Transaction(t.date, t.payee, t.cleared, t.note, postings, t.mid),
        ];
      }
      return [
        new Transaction(t.date, t.payee, t.cleared, t.note, t.postings, t.mid),
      ];
    }
    return [];
  };
}

export class Event {
  constructor(
    public readonly name: string,
    public readonly total: number,
    public readonly transactions: Transactions
  ) {}

  get key(): string {
    return this.name;
  }
}

export class Month {
  constructor(
    public readonly date: Date,
    public readonly expenses: Event[],
    public readonly savings: Event[]
  ) {}

  get key(): string {
    return this.date.toISOString();
  }

  get title(): string {
    return dateformat(this.date, "mmmm yyyy", true);
  }
}

function sortEvents(expenses: Event[]): Event[] {
  return _.reverse(_.sortBy(expenses, (e: Event) => e.total));
}

export class Glance {
  constructor(
    public readonly available: number,
    public readonly emergency: number
  ) {}
}

function generateEvents(eventTxs: Transactions): Event[] {
  return sortEvents(
    _.values(
      _.mapValues(
        eventTxs.balances().balances,
        (total: number, name: string) => {
          return new Event(
            name,
            total,
            eventTxs.map(transactionsMatchingPath(["^" + name + "$"]))
          );
        }
      )
    )
  );
}

export class AccountVelocity {
  constructor(
    public readonly name: string,
    public readonly timeWindow: TimeWindow,
    public readonly total: number
  ) {}

  get perWeek(): number {
    return this.timeWindow.scaledWeekly(this.total);
  }
}

export class Velocity {
  constructor(
    public readonly timeWindow: TimeWindow,
    public readonly balances: Balances
  ) {}

  get velocities(): AccountVelocity[] {
    return _.map(
      this.balances.balances,
      (balance: number, name: string) =>
        new AccountVelocity(name, this.timeWindow, balance)
    );
  }

  static of(txs: Transactions): Velocity {
    return new Velocity(txs.timeWindow, txs.balances().absolute());
  }
}

export const isExpense = (path: string): boolean => {
  return path.startsWith("expense:");
};

export const isIncome = (path: string): boolean => {
  return path.startsWith("income:");
};

export const isAllocation = (path: string): boolean => {
  return path.startsWith("allocations:");
};

export const isReserved = (path: string): boolean => {
  return path.endsWith(":reserved");
};

export const isVirtual = (path: string): boolean => {
  return (
    isAllocation(path) ||
    isReserved(path) ||
    isIncome(path) ||
    isExpense(path) ||
    path.startsWith("receivable:")
  );
};

export const isPhysical = (path: string): boolean => {
  return !isVirtual(path);
};

export class Income {
  constructor(
    public readonly tx: Transaction,
    public readonly everything: Transactions
  ) {}

  private get mid(): string {
    if (!this.tx.mid) throw new Error();
    return this.tx.mid;
  }

  get key(): string {
    return this.mid;
  }

  get deposited(): number {
    return _.sum(
      this.tx.postings.filter((p) => isPhysical(p.account)).map((p) => p.value)
    );
  }

  get references(): Transaction[] {
    return this.everything.references(this.mid);
  }

  get allocations(): Posting[] {
    const references = _.flatten(this.references.map((tx) => tx.postings));
    const fromReferences = references.filter((p: Posting) =>
      isAllocation(p.account)
    );
    const ourselves = this.tx.postings.filter((p) => isAllocation(p.account));
    return [...ourselves, ...fromReferences];
  }

  get expensesPaidBack(): Transaction[] {
    const paybacks = this.references.filter((tx) =>
      tx.payee.startsWith("payback")
    );
    const paybackReferences = paybacks.map((payback) => {
      const references = _.uniq(
        _.flatten(
          payback.references.map((mid, index) =>
            this.everything.references(mid).map((tx) => {
              return {
                tx,
                index,
              };
            })
          )
        )
      );
      console.log("payback", payback.payee, payback.references, references);
      return {
        payback,
        references,
      };
    });
    console.log("payback-refs", paybackReferences);
    return paybacks;
  }

  get allocationAccounts(): string[] {
    return this.tx.postings.map((p) => p.account).filter(isAllocation);
  }

  get physicalAccounts(): string[] {
    return this.tx.postings.map((p) => p.account).filter(isPhysical);
  }

  get prettyDate(): string {
    return dateformat(this.tx.date, "mmmm yyyy", true);
  }

  get title(): string {
    return `${this.prettyDate} ${this.tx.payee}`;
  }
}

export class Finances {
  constructor(public readonly txs: Transactions) {}

  static build(data: TransactionResponse[]) {
    return new Finances(Transactions.build(data));
  }

  glance(): Glance {
    const availableTxs = this.txs.map(
      transactionsMatchingPath([".+:available$"])
    );
    const emergencyTxs = this.txs.map(
      transactionsMatchingPath([".+:emergency$"])
    );
    const available = availableTxs.balance();
    const emergency = emergencyTxs.balance();
    return new Glance(available, emergency);
  }

  incomes(): Income[] {
    const incomeTxs = this.txs
      .map(
        transactionsMatchingPath(["^income:"], { excludeOtherPostings: false })
      )
      .excluding((tx) => {
        return /\S+ interest/.test(tx.payee);
      })
      .excluding((tx) => {
        return /dividend/.test(tx.payee);
      });

    return _.reverse(
      incomeTxs.transactions.map((tx) => {
        console.log("income:", tx);
        return new Income(tx, this.txs);
      })
    );
  }

  months(): Month[] {
    const expenses = this.txs
      .map(transactionsMatchingPath(["^expenses:"]))
      .excludeTagged("no-velocity");

    /*
    function debug(v: Velocity) {
      console.log("Velocity", v);
      console.log("velocities", v.velocities);
      console.log(
        "per-week",
        v.velocities.map((v) => {
          return { name: v.name, weekly: v.perWeek };
        })
      );
    }

    debug(Velocity.of(income));
    debug(Velocity.of(expenses));
    */

    const monthly = this.txs.monthly();
    return _.reverse(
      _.map(monthly.transactions, (value: Transactions, yearMonth: string) => {
        const expenses = generateEvents(
          value.map(transactionsMatchingPath(["^expenses:"]))
        );
        const savings = generateEvents(
          value.map(transactionsMatchingPath(["allocations:checking:savings"]))
        );

        const allocations = value.map(
          transactionsMatchingPath(["^expenses:"], {
            excludeOtherPostings: false,
          })
        );

        const ok = allocations.transactions.map((t: Transaction) => {
          const paidFrom = t.resolvePaidFrom();
          if (!paidFrom) throw new Error("unable to resolve paid-from");
          return { t: t, paidFrom: paidFrom };
        });

        const totalPaid = _.sum(ok.map((p) => p.paidFrom.value));
        const totalExpenses = _.sum(expenses.map((e) => e.total));
        const difference = totalPaid + totalExpenses;

        if (false && Math.abs(difference) < 50) {
          console.log(yearMonth, totalPaid, totalExpenses, difference);

          ok.forEach((row) => {
            if (row.paidFrom.value >= 0) {
              console.warn(yearMonth, row.paidFrom, row.t.payee);
            } else {
              console.log(yearMonth, row.paidFrom, row.t.payee);
            }
          });

          expenses.forEach((expense) => {
            expense.transactions.transactions.forEach((t) => {
              const other = t.posting((name) => name.startsWith(expense.name));
              console.log(yearMonth, expense.name, t.payee, other);
              if (other == null) {
                console.log(expense.name, t.postings);
              }
            });
          });

          const sorted = (a: any[]) => {
            return _.sortBy(a, ["date", "total"]);
          };

          const fromPaid = sorted(
            ok.map((row) => {
              return {
                date: row.t.date,
                payee: row.t.payee,
                total: -row.paidFrom.value,
              };
            })
          );

          const fromExpenses = sorted(
            _.flatten(
              expenses.map((expense, i) => {
                return expense.transactions.transactions.map(
                  (t: Transaction) => {
                    return {
                      date: t.date,
                      payee: t.payee,
                      total: t.postings[0].value,
                    };
                  }
                );
              })
            )
          );

          // console.log(fromPaid);
          // console.log(fromExpenses);
          // const diff = variableDiff(fromPaid, fromExpenses);
          // console.log(diff.text);

          // Calculate income velocity
          // Calculate expense velocity
        }

        // Find expense spending.
        // Find allocation.
        // Find how long deposits take to accumulate that money.

        return new Month(new Date(yearMonth), expenses, savings);
      })
    );
  }
}
