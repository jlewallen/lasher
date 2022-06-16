<script setup lang="ts">
import type { Event, Income, Posting } from "@/model";

defineProps<{
  income: Income;
}>();
</script>

<script lang="ts">
import _ from "lodash";
import { isAllocation } from "@/model";

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
      (<Currency :value="income.deposited" /> / <Currency :value="total" />)
    </div>
    <div v-if="false">
      <div v-for="(alloc, i) in income.allocations" v-bind:key="i">
        {{ alloc.account }} <Currency :value="alloc.value" />
      </div>
    </div>
    <div class="allocation-buckets" v-if="income.allocationBuckets.length > 0">
      <MoneyBuckets :buckets="income.allocationBuckets" />
    </div>
    <div class="spending-buckets" v-if="income.preallocated.length > 0">
      <MoneyBuckets :buckets="income.spending" />
      <MoneyBucketsTotal :buckets="income.spending" />
    </div>
    <div class="preallocated-buckets" v-if="income.preallocated.length > 0">
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

::v-deep .allocation-buckets .currency-value {
  color: #efefaa;
}

::v-deep .spending-buckets .currency-value {
  color: #d2a4c8;
}
</style>
