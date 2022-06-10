<script setup lang="ts">
import type { MoneyBucket } from "@/model";

defineProps<{
  buckets: MoneyBucket[];
}>();
</script>

<script lang="ts">
import Currency from "./Currency.vue";

export default {
  components: {
    Currency,
  },
  methods: {},
};
</script>

<template>
  <div class="buckets">
    <div v-for="bucket in buckets" v-bind:key="bucket.name" class="bucket">
      <span class="name">{{ bucket.name }}</span>
      <span class="total"> <Currency :value="bucket.total" /></span>
    </div>
  </div>
</template>

<style scoped>
.bucket .name {
  padding-right: 0.5em;
}

.bucket .total {
  font-size: 16pt;
}
</style>
