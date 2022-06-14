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

export default {
  components: {
    Currency,
    MoneyBuckets,
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
    <div>
      <MoneyBuckets :buckets="income.preallocated" />
      <MoneyBuckets :buckets="income.spending" />
    </div>
  </div>
</template>

<style scoped>
.title {
  font-size: 18pt;
  font-weight: bold;
  cursor: pointer;
}

/*
.title .path-summary {
  display: inline-block;
  padding-right: 0.5em;
}

::v-deep .tree-node {
  line-height: 2.2em;
}
*/
</style>
