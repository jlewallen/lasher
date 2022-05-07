<script setup lang="ts">
import type { Glance } from "@/model";

defineProps<{
  glance: Glance;
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
  <div class="glance">
    <div>Available: <Currency :value="glance.available" /></div>
    <div>Emergency: <Currency :value="glance.emergency" /></div>
  </div>
</template>

<style scoped>
.glance {
  font-size: 14pt;
}
</style>
