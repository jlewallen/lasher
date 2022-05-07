import _ from "lodash";
import dateformat from "dateformat";

interface TransactionResponse {
  date: string;
  payee: string;
  cleared: boolean;
  postings: { account: string; value: number; note: string }[];
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
    public readonly postings: Posting[]
  ) {}
}

class Balances {
  constructor(public readonly balances: { [index: string]: number }) {}
}

type MapTransactionFn = (t: Transaction) => Transaction[];

class Transactions {
  constructor(public readonly transactions: Transaction[]) {}

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
          postings
        );
      })
    );
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

function transactionsMatchingPath(pattern: string): MapTransactionFn {
  const re = new RegExp(pattern);
  return (t: Transaction): Transaction[] => {
    const postings = t.postings.filter((p) => re.test(p.account));
    if (postings.length > 0) {
      return [new Transaction(t.date, t.payee, t.cleared, postings)];
    }
    return [];
  };
}

export class Expense {
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
    public readonly expenses: Expense[]
  ) {}

  get key(): string {
    return this.date.toISOString();
  }
}

export class Finances {
  constructor(public readonly txs: Transactions) {}

  static build(data: TransactionResponse[]) {
    return new Finances(Transactions.build(data));
  }

  months(): Month[] {
    const monthly = this.txs.monthly();
    return _.map(monthly.transactions, (value, key) => {
      const expenseTxs = value.map(transactionsMatchingPath("^expenses"));
      console.log(key, new Date(key), value, expenseTxs);
      const expenses = _.values(
        _.mapValues(
          expenseTxs.balances().balances,
          (total: number, name: string) => {
            return new Expense(
              name,
              total,
              expenseTxs.map(transactionsMatchingPath(name))
            );
          }
        )
      );
      console.log(expenses);
      return new Month(new Date(key), expenses);
    });
  }
}
