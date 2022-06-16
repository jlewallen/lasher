<script setup lang="ts">
import type { MoneyBucket } from "@/model";

defineProps<{
  buckets: MoneyBucket[];
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
      return _.sum(this.buckets.map((mb) => mb.total));
    },
  },
};
</script>

<template>
  <Currency :value="total" />
</template>

<style scoped></style>
