<script setup lang="ts">
import type { Event, Income, Posting } from "@/model";
import { isAllocation, MoneyBucket } from "@/model";

defineProps<{
  income: Income;
}>();
</script>

<script lang="ts">
import _ from "lodash";

import Currency from "./Currency.vue";
import TransactionLedger from "./TransactionLedger.vue";
import MoneyBuckets from "./MoneyBuckets.vue";
import MoneyBucketsTotal from "./MoneyBucketsTotal.vue";

export default {
  components: {
    Currency,
    MoneyBuckets,
    MoneyBucketsTotal,
    TransactionLedger,
  },
  data(): {} {
    return {};
  },
  computed: {
    total(): number {
      return (
        _.sum(this.income.preallocated.map((mb) => mb.total)) +
        _.sum(this.income.spending.map((mb) => mb.total))
      );
    },
    spending(): MoneyBucket[] {
      return this.income.spending;
    },
    totalAllocations(): number {
      return MoneyBucket.total(this.income.allocationBuckets);
    },
    totalSpending(): number {
      return MoneyBucket.total(this.spending);
    },
    originalSpending(): MoneyBucket[] {
      return this.spending.filter((mb) => !mb.taxes);
    },
    totalOriginalSpending(): number {
      return MoneyBucket.total(this.spending);
    },
    taxes(): MoneyBucket[] {
      return this.spending.filter((mb) => mb.taxes);
    },
    totalTaxes(): number {
      return MoneyBucket.total(this.taxes);
    },
    totalPreallocations(): number {
      return MoneyBucket.total(this.income.preallocated);
    },
  },
  methods: {
    onClick() {
      console.log("income: click", this.income);
    },
    onlyAllocationsFilter(posting: Posting): boolean {
      return isAllocation(posting.account);
    },
  },
};
</script>

<template>
  <div class="month">
    <div class="title" @click="onClick">
      {{ income.title }}
    </div>
    <div class="totals" @click="onClick">
      <span class="deposited"><Currency :value="income.deposited" /></span> -
      <span class="allocations"><Currency :value="totalAllocations" /></span>
      -
      <span class="spending"><Currency :value="totalOriginalSpending" /></span>
      -
      <span class="taxes"><Currency :value="totalTaxes" /></span>
      -
      <span class="preallocations"
        ><Currency :value="totalPreallocations"
      /></span>
      = 0
    </div>
    <div class="allocations" v-if="income.allocationBuckets.length > 0">
      <MoneyBuckets :buckets="income.allocationBuckets" />
    </div>
    <div class="spending" v-if="originalSpending.length > 0">
      <MoneyBuckets :buckets="originalSpending" />
      <MoneyBucketsTotal :buckets="originalSpending" />
    </div>
    <div class="taxes" v-if="taxes.length > 0">
      <MoneyBuckets :buckets="taxes" />
      <MoneyBucketsTotal :buckets="taxes" />
    </div>
    <div class="preallocations" v-if="income.preallocated.length > 0">
      <MoneyBuckets :buckets="income.preallocated" />
      <MoneyBucketsTotal :buckets="income.preallocated" />
    </div>
    <div>
      <TransactionLedger
        :transactions="income.originalAndReferences"
        :filter="(p) => true"
        v-if="
          income.spending.length == 0 &&
          income.preallocated.length == 0 &&
          income.allocationBuckets.length == 0
        "
      />
    </div>
  </div>
</template>

<style scoped>
.title {
  font-size: 18pt;
  font-weight: bold;
  cursor: pointer;
}

::v-deep .allocations .currency-value {
  color: #efefaa;
}

::v-deep .spending .currency-value {
  color: #d2a4c8;
}

::v-deep .taxes .currency-value {
  color: #69b076;
}
</style>
