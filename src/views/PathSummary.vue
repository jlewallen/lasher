<script setup lang="ts">
import type { Event } from "@/model";

defineProps<{
  path: string;
  expenses: Event[];
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
      return _.sum(this.expenses.map((e: Event) => e.total));
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
