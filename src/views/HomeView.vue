<script lang="ts">
import _ from "lodash";
import { Finances, Month, Income, Glance } from "@/model";

import Glance from "./Glance.vue";
import InteractiveMonth from "./InteractiveMonth.vue";
import InteractiveIncome from "./InteractiveIncome.vue";

export default {
  components: {
    Glance,
    InteractiveMonth,
    InteractiveIncome,
  },
  data(): {
    months: Month[];
    incomes: Income[];
    glance: null | Glance;
  } {
    return {
      months: [],
      incomes: [],
      glance: null,
    };
  },
  mounted(): void {
    fetch("ledger.json")
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        const finances = Finances.build(data);
        this.months = finances.months();
        this.incomes = finances.incomes();
        this.glance = finances.glance();
      });
  },
};
</script>

<template>
  <main>
    <Glance :glance="glance" v-if="glance" />
    <div class="incomes">
      <div v-for="income in incomes" v-bind:key="income.key">
        <InteractiveIncome :income="income" />
      </div>
    </div>
    <div class="months">
      <div v-for="(month, i) in months" v-bind:key="month.key">
        <InteractiveMonth :month="month" :open-expanded="i == 0" />
      </div>
    </div>
  </main>
</template>
