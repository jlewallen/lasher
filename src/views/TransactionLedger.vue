<script setup lang="ts">
import type { Transactions, Transaction, Posting } from "@/model";

defineProps<{
  transactions: Transactions | Transaction[];
  filter: (p: Posting) => boolean;
}>();
</script>

<script lang="ts">
import _ from "lodash";
import Currency from "./Currency.vue";

export default {
  components: {
    Currency,
  },
};
</script>

<template>
  <div class="transactions">
    <table class="">
      <tbody>
        <tr
          v-for="(tx, i) in _.isArray(transactions)
            ? transactions
            : transactions.transactions"
          v-bind:key="i"
        >
          <td class="tx-date">{{ tx.prettyDate }}</td>
          <td class="tx-payee">{{ tx.prettyPayee }}</td>
          <td class="tx-note">{{ tx.note }}</td>
          <td>
            <div
              v-for="(p, j) in tx.postings"
              v-bind:key="j"
              v-bind:class="{ hidden: !filter(p) }"
            >
              <span class="posting-account" v-show="true">
                {{ p.account }}
              </span>
              <span class="posting-note" v-show="false">
                {{ p.note }}
              </span>
              <span class="posting-value"><Currency :value="p.value" /></span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.tx-date {
  color: #404040;
}

.tx-date {
  vertical-align: top;
}

.tx-payee {
  vertical-align: top;
}

.posting-account {
  padding-right: 1em;
  color: #404040;
}

.posting-note {
  padding-right: 1em;
  color: #3f4e93;
}

.hidden {
  display: none;
}
</style>
