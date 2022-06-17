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

export type StringPredicate = (s: string) => boolean;

export type PostingPredicate = (p: Posting) => boolean;

export const isExpense = (path: string): boolean => {
  return path.startsWith("expenses:");
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

export const rankAccount = (path: string): number => {
  return 0;
};

export class Posting {
  constructor(
    public readonly account: string,
    public readonly value: number,
    public readonly note: string
  ) {}
}

export class Transaction {
  constructor(
    public readonly date: Date,
    public readonly payee: string,
    public readonly cleared: boolean,
    public readonly note: string,
    public readonly postings: Posting[],
    public readonly mid: string | undefined = undefined
  ) {}

  get magnitude(): number {
    return this.magnitudeOf((p) => p.value > 0);
  }

  get prettyDate(): string {
    return dateformat(this.date, "yyyy/mm/dd");
  }

  get prettyPayee(): string {
    return this.payee.replace(/#\S+#/, "");
  }

  private get allReferences(): string[] {
    const m = /#(\S+)#/.exec(this.payee);
    return m ? m[1].split(",") : [];
  }

  get references(): string[] {
    return this.allReferences.filter((mid: string) => mid.indexOf("_") < 0);
  }

  magnitudeOf(predicate: (p: Posting) => boolean): number {
    return _.sum(this.postings.filter(predicate).map((p) => p.value));
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

  posting(predicate: StringPredicate): Posting | null {
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

class TransactionAndTotals {
  constructor(public readonly tx: Transaction, public readonly total: number) {}
}

class ReduceState {
  constructor(
    public readonly txs: TransactionAndTotals[],
    public readonly total: number
  ) {}
}

class Transactions {
  readonly byMid_: { [index: string]: Transaction };
  readonly references_: { [index: string]: Transaction[] };

  constructor(public readonly transactions: Transaction[]) {
    this.byMid_ = _.fromPairs(transactions.map((tx) => [tx.mid, tx]));
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

  get timeWindow(): TimeWindow {
    const dates = this.transactions.map((t) => t.date);
    const min = _.min(dates);
    const max = _.max(dates);
    return new TimeWindow(min, max);
  }

  public static filterPostingsGroupAndSum(
    transactions: Transaction[],
    predicate: PostingPredicate,
    options: { assumeOnePosting: boolean } = { assumeOnePosting: true }
  ): MoneyBucket[] {
    return _(transactions)
      .map((tx: Transaction) => {
        const postings = tx.postings.filter(predicate);
        if (options.assumeOnePosting) {
          if (postings.length != 1) {
            console.log(`error: Assumption:`, tx, postings);
            throw new Error("assumption");
          }
        } else {
        }
        return postings.map((posting) => {
          return {
            name: posting.account,
            value: posting.value,
          };
        });
      })
      .flatten()
      .groupBy((row: NameAndValue) => row.name)
      .map(
        (rows: NameAndValue[], name: string) =>
          new MoneyBucket(name, _.sum(rows.map((r: NameAndValue) => r.value)))
      )
      .sortBy((mb: MoneyBucket) => mb.name)
      .value();
  }

  allAfterBalance(pattern: string, balance: number): Transaction[] {
    const re = new RegExp(pattern);
    const filtered = this.transactions.filter(
      (tx) => tx.postings.filter((p) => re.test(p.account)).length > 0
    );

    const byDate = _.sortBy(filtered, (t: Transaction) => t.date);
    const running = _.reduce(
      byDate,
      (prev: ReduceState, tx: Transaction) => {
        const sub =
          prev.total + tx.magnitudeOf((p: Posting) => re.test(p.account));
        const item = new TransactionAndTotals(tx, sub);
        // This builds the list in reverse order.
        return new ReduceState([item, ...prev.txs], sub);
      },
      new ReduceState([], 0)
    );

    // console.log("emer:running", running);

    const interesting = _.takeWhile(
      running.txs,
      (r: TransactionAndTotals, index: number) => r.total < balance
    );

    // console.log("emer:interesting", interesting);

    return interesting.map((r: TransactionAndTotals) => r.tx);
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

export class MoneyBucket {
  constructor(public readonly name: string, public readonly total: number) {}

  get taxes(): boolean {
    return this.name.endsWith(":tax");
  }

  static total(buckets: MoneyBucket[]): number {
    return _.sum(buckets.map((mb) => mb.total));
  }

  static merge(buckets: MoneyBucket[]): MoneyBucket[] {
    return _(buckets)
      .groupBy((b: MoneyBucket) => b.name)
      .map((group: MoneyBucket[], name: string) => {
        return new MoneyBucket(name, _.sum(group.map((mb) => mb.total)));
      })
      .sortBy((mb: MoneyBucket) => -mb.total)
      .value();
  }
}

type PaybacksAndBuckets = { paybacks: Transaction[]; buckets: MoneyBucket[] };

type PaybackAndBuckets = { payback: Transaction; buckets: MoneyBucket[] };

const createTaxes = (original: string, total: number): MoneyBucket[] => {
  if (total > 0) {
    return [new MoneyBucket(original + ":tax", total)];
  }
  return [];
};

export class Payback {
  public readonly buckets: MoneyBucket[];

  constructor(
    public readonly original: Transaction,
    public readonly paybacks: Transaction[]
  ) {
    this.buckets = this.calculateBuckets();
  }

  private calculateBuckets(): MoneyBucket[] {
    const debug = false; // this.original.payee.indexOf("superior") >= 0;

    const log = (...args: unknown[]) => {
      if (debug) {
        console.log(
          `${this.original.prettyDate} ${this.original.prettyPayee}`,
          ...args
        );
      }
    };

    // TODO Right now we only end up in here with 'paybacks' that specifically
    // reference an income. This means that paybacks that happen from the
    // refunded account never get included.

    // How much physical money is involved. Otherwise this will include
    // allocations and that usually incorrectly doubles the desired value.
    const originalMagnitude = Math.abs(
      this.original.magnitudeOf((p) => isPhysical(p.account))
    );
    const expenses = this.original.postings
      .filter((p) => isExpense(p.account))
      .filter((p) => p.account != "expenses:cash:tips"); // TOOD Hack

    // Calculate how much was paid back in expenses and how much was paid in
    // taxes. Taxes can be any additional money that's moved on top of the
    // amount to pay back the original expense.
    const normalPaybacks = this.paybacks.filter(
      (tx: Transaction) => !isTaxesTransaction(tx)
    );
    const taxesPaybacks = this.paybacks.filter((tx) => isTaxesTransaction(tx));
    const paybackMagnitude = _.sum(normalPaybacks.map((tx) => tx.magnitude));
    const taxesMagnitude = _.sum(taxesPaybacks.map((tx) => tx.magnitude));

    if (debug) {
      log(
        `${originalMagnitude} payback=${paybackMagnitude} taxes=${taxesMagnitude} ${this.original.mid}`
      );
      log(`org`, this.original.postings);
      log(`pay`, this.paybacks);
    }

    // If there's only one expense the money can go towards and the magnitudes
    // are the same then we can assume that's where things went, yes?
    if (
      expenses.length == 1 // && Math.abs(originalMagnitude - paybackMagnitude) < 0.01
    ) {
      const expenseBuckets = normalPaybacks.map(
        (tx: Transaction) => new MoneyBucket(expenses[0].account, tx.magnitude)
      );
      const taxBuckets = _.flatten(
        taxesPaybacks.map((tx: Transaction) => [
          ...createTaxes(expenses[0].account, tx.magnitude),
        ])
      );
      log("expenses == 1");
      return [...expenseBuckets, ...taxBuckets];
    }

    // Look for payback transactions that match a posting in the original
    // expense exactly.
    const exactMatches = _.flatten(
      normalPaybacks
        .map((payback: Transaction) => {
          // TODO We should exclude expenses that match just in case there's
          // multiple postings with the same value.
          // TODO Maybe at least warn?
          const maybe = expenses.filter(
            (expense: Posting) => Math.abs(expense.value) == payback.magnitude
          );
          return {
            payback: payback,
            buckets: maybe.map(
              (expense: Posting) =>
                new MoneyBucket(expense.account, payback.magnitude)
            ),
          };
        })
        .filter((em: PaybackAndBuckets) => em.buckets.length > 0)
    );

    // We only need to return the buckets so get the buckets that were matched
    // exactly above.
    const exactBuckets = _.flatten(
      exactMatches.map((em: { buckets: MoneyBucket[] }) => em.buckets)
    );

    // We may not match all of the paybacks exactly, so remove those that were.
    const afterExactMatches = _.difference(
      this.paybacks,
      exactMatches.map((em: { payback: Payback }) => em.payback)
    );

    // Some other common scenarios.
    /*
    const findSimplePartialPaybacks = (): PaybacksAndBuckets[] => {
      if (taxesMagnitude > 0 || expenses.length != 1) {
        return [];
      }
      return [
        {
          paybacks: afterExactMatches,
          buckets: [
            ...afterExactMatches.map(
              (tx: Transaction) =>
                new MoneyBucket(expenses[0].account, tx.magnitude)
            ),
            ...createTaxes(expenses[0].account, taxesMagnitude),
          ],
        },
      ];
    };

    const simplePartialPaybacks = findSimplePartialPaybacks();
    */
    const simplePartialPaybacks: PaybacksAndBuckets[] = [];

    const remainingPaybacks = _.difference(
      afterExactMatches,
      _.flatten(simplePartialPaybacks.map((row) => row.paybacks))
    );

    const remainingBuckets = remainingPaybacks.map(
      (p: Payback) => new MoneyBucket(this.name, p.magnitude)
    );

    if (remainingPaybacks.length > 0) {
      if (originalMagnitude > 0) {
        log(`sim`, simplePartialPaybacks);
        log(`fail`, remainingPaybacks);
      }
    }

    const remainingTaxes = createTaxes("unknown:taxes", taxesMagnitude);

    return [...exactBuckets, ...remainingBuckets, ...remainingTaxes];
  }

  get name(): string {
    return this.original.payee;
  }

  get magnitude(): number {
    return _.sum(this.paybacks.map((tx: Transaction) => tx.magnitude));
  }
}

export type NameAndValue = { name: string; value: number };

export type PaybackAndOriginal = {
  payback: Transaction;
  original: Transaction;
};

export const isTaxesTransaction = (tx: Transaction): boolean => {
  return tx.payee.indexOf("taxes on") >= 0;
};

export class EmergencySpending {
  constructor(private readonly everything: Transactions) {}

  private get borrowed(): Transaction[] {
    return this.everything.allAfterBalance("^.+emergency$", 1000);
  }

  get buckets(): MoneyBucket[] {
    return Transactions.filterPostingsGroupAndSum(
      this.borrowed,
      (p) => isAllocation(p.account) && p.value > 0
    );
  }
}

export class Income {
  public readonly expensePaybacks: Payback[];

  constructor(
    public readonly tx: Transaction,
    private readonly everything: Transactions
  ) {
    this.expensePaybacks = this.createExpensePaybacks();
  }

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

  get originalAndReferences(): Transaction[] {
    return [this.tx, ...this.references];
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

  get preallocated(): MoneyBucket[] {
    const references = this.references;

    const simplePreallocations = references.filter((tx: Transaction) =>
      tx.payee.startsWith("preallocating")
    );

    const preallocatedBuckets = Transactions.filterPostingsGroupAndSum(
      simplePreallocations,
      (p) => isAllocation(p.account)
    );

    const otherPreallocations = _.difference(
      references.filter((tx) => tx.references.length == 1),
      simplePreallocations
    );

    const otherBuckets = Transactions.filterPostingsGroupAndSum(
      otherPreallocations,
      (p) => isAllocation(p.account),
      { assumeOnePosting: false }
    );

    return MoneyBucket.merge([...otherBuckets, ...preallocatedBuckets]);
  }

  get spending(): MoneyBucket[] {
    const paybacks = this.expensePaybacks;

    const buckets = _.flatten(paybacks.map((payback) => payback.buckets));

    return MoneyBucket.merge(buckets);
  }

  private createExpensePaybacks(): Payback[] {
    // First get all payback transactions.
    const paybackTransactions = this.references.filter((tx) =>
      tx.payee.startsWith("payback")
    );

    // Group them by their "original" withrawl.
    const byOriginal = _(paybackTransactions)
      .map((payback: Transaction) => {
        const originals = _.uniq(
          this.everything.find(_.take(payback.references, 1))
        );

        if (originals.length != 1) {
          throw new Error("payback: Missing original");
        }

        return {
          payback: payback,
          original: originals[0],
        };
      })
      .groupBy((row: PaybackAndOriginal) => row.original.mid)
      .map((rows: PaybackAndOriginal[]) => {
        return {
          original: rows[0].original,
          paybacks: rows.map((row) => row.payback),
        };
      })
      .value();

    return _(byOriginal)
      .map(
        ({
          original,
          paybacks,
        }: {
          original: Transaction;
          paybacks: Transaction[];
        }) => {
          return new Payback(original, paybacks);
        }
      )
      .value();
  }

  get allocationPostings(): Posting[] {
    return this.tx.postings.filter((p) => isAllocation(p.account));
  }

  get allocationBuckets(): MoneyBucket[] {
    return this.allocationPostings.map(
      (p) => new MoneyBucket(p.account, p.value)
    );
  }

  get allocationAccounts(): string[] {
    return this.allocationPostings.map((p) => p.account);
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
  public readonly incomes: Income[];

  constructor(public readonly txs: Transactions) {
    this.incomes = this.createIncomes();
  }

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

  emergencySpending(): EmergencySpending {
    return new EmergencySpending(this.txs);
  }

  private createIncomes(): Income[] {
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
        const income = new Income(tx, this.txs);
        console.log("income:", tx.mid, income.expensePaybacks);
        return income;
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
