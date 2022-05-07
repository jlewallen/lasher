<script setup lang="ts">
import type { Expense, Month } from "@/model";

defineProps<{
  month: Month;
}>();
</script>

<script lang="ts">
import _ from "lodash";
import PathSummary from "./PathSummary.vue";
import InteractiveExpense from "./InteractiveExpense.vue";
import AccountTree from "./AccountTree.vue";

export default {
  components: {
    PathSummary,
    InteractiveExpense,
    AccountTree,
  },
  computed: {
    expensesByPath(): { [index: string]: Expense } {
      return _.fromPairs(this.month.expenses.map((e: Expense) => [e.name, e]));
    },
    accounts(): string[] {
      return Object.keys(this.expensesByPath);
    },
  },
  methods: {
    childExpenses(prefix: string): Expense[] {
      return Object.keys(this.expensesByPath)
        .filter((path) => {
          return path.startsWith(prefix);
        })
        .map((path) => {
          return this.expensesByPath[path];
        });
    },
  },
};
</script>

<template>
  <div class="month">
    <div class="title">{{ month.title }}</div>
    <AccountTree :accounts="accounts">
      <template #path="{ path }">
        <PathSummary :path="path" :expenses="childExpenses(path)" />
      </template>
      <template #leaf="{ path }">
        <InteractiveExpense
          :expense="expensesByPath[path]"
          :open-expanded="false"
        />
      </template>
    </AccountTree>
  </div>
</template>

<style scoped>
.title {
  font-size: 18pt;
  font-weight: bold;
}
</style>
