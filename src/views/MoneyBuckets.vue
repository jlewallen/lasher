<script setup lang="ts">
import type { MoneyBucket, Balances } from "@/model";

defineProps<{
  buckets: MoneyBucket[];
  balances?: Balances;
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
    balanceOf(name: string): number | null {
      if (!this.balances) {
        return null;
      }
      return this.balances.of(name);
    },
    required(value: number | null): number {
      if (value === null) throw new Error("value is required");
      return value;
    },
  },
};
</script>

<template>
  <div class="buckets">
    <template v-for="bucket in buckets" v-bind:key="bucket.name">
      <div class="bucket" @click="onClick(bucket)">
        <span class="name">{{ bucket.name }}</span>
        <span class="total"> <Currency :value="bucket.total" /> </span>
        <span class="balance" v-if="balanceOf(bucket.name)">
          <Currency :value="required(balanceOf(bucket.name))" />
        </span>
        <div v-if="focused && focused.name == bucket.name"><slot /></div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.bucket .name {
  padding-right: 0.5em;
}
.bucket .balance {
  padding-left: 0.5em;
}
.bucket .total {
  font-size: 16pt;
}
</style>
