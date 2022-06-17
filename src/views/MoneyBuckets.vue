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
  data(): { focused: MoneyBucket | null } {
    return {
      focused: null,
    };
  },
  methods: {
    onClick(bucket: MoneyBucket) {
      if (this.focused == bucket) {
        this.focused = null;
        this.$emit("clicked", bucket);
      } else {
        this.focused = bucket;
      }
    },
  },
};
</script>

<template>
  <div class="buckets">
    <template v-for="bucket in buckets" v-bind:key="bucket.name">
      <div class="bucket" @click="onClick(bucket)">
        <span class="name">{{ bucket.name }}</span>
        <span class="total"> <Currency :value="bucket.total" /></span>
        <div v-if="focused && focused.name == bucket.name"><slot /></div>
      </div>
    </template>
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
