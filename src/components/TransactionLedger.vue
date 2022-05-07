<script setup lang="ts">
import { Transactions } from "@/model";

defineProps<{
  transactions: Transactions;
}>();
</script>

<script lang="ts">
import _ from "lodash";

export default {
  methods: {
    formatCurrency(value: number): string {
      return Intl.NumberFormat("en-US").format(value);
    },
  },
};
</script>

<template>
  <div class="transactions">
    <table class="">
      <tbody>
        <tr v-for="(tx, i) in transactions.transactions" v-bind:key="i">
          <td class="posting-date">{{ tx.prettyDate }}</td>
          <td class="posting-payee">{{ tx.payee }}</td>
          <td>
            <div v-for="(p, j) in tx.postings" v-bind:key="j">
              <span class="posting-account">
                {{ p.account }}
              </span>
              <span class="posting-value">${{ formatCurrency(p.value) }}</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.posting-date {
  color: #404040;
}

.posting-account {
  padding-right: 1em;
  color: #404040;
}

.posting-value {
  color: #efefaa;
  color: #009854;
  color: #69b076;
}
</style>
