<script setup lang="ts">
import type { EmergencySpending } from "@/model";

defineProps<{
  spending: EmergencySpending;
}>();
</script>

<script lang="ts">
import _ from "lodash";

import MoneyBuckets from "./MoneyBuckets.vue";
// import Currency from "./Currency.vue";
// import TransactionLedger from "./TransactionLedger.vue";

export default {
  components: {
    MoneyBuckets,
    // Currency,
    // TransactionLedger,
  },
  data(): {} {
    return {};
  },
  computed: {},
  methods: {},
};
</script>

<template>
  <div class="emergency">
    <MoneyBuckets :buckets="spending.buckets" />
  </div>
</template>

<style scoped></style>
