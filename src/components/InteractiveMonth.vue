<script setup lang="ts">
import type { Expense, Month } from "@/model";

defineProps<{
  month: Month;
  openExpanded: boolean;
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
  data(): { expanded: boolean } {
    return {
      expanded: this.openExpanded,
    };
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
    onClick() {
      this.expanded = !this.expanded;
    },
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
    <div class="title" @click="onClick">{{ month.title }}</div>
    <div class="expanded-month" v-if="expanded">
      <AccountTree :accounts="accounts" :open-expanded="openExpanded">
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
  </div>
</template>

<style scoped>
.title {
  font-size: 18pt;
  font-weight: bold;
  cursor: pointer;
}
</style>
