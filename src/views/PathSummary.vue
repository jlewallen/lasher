<script setup lang="ts">
import type { Expense } from "@/model";

defineProps<{
  path: string;
  expenses: Expense[];
  showPath: boolean;
}>();
</script>

<script lang="ts">
import _ from "lodash";
import Currency from "./Currency.vue";

export default {
  components: {
    Currency,
  },
  computed: {
    total(): number {
      return _.sum(this.expenses.map((e: Expense) => e.total));
    },
  },
  methods: {
    formatCurrency(value: number): string {
      return Intl.NumberFormat("en-US").format(value);
    },
  },
};
</script>

<template>
  <div class="path-summary">
    <span class="name" v-if="showPath">{{ path }}</span>
    <span class="total"><Currency :value="total" /></span>
  </div>
</template>

<style scoped>
.name {
  padding-right: 0.5em;
}
.total {
  font-size: 16pt;
}
</style>
