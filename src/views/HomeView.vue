<script lang="ts">
import _ from "lodash";
import { Finances, Month, Income, Glance, EmergencySpending } from "@/model";

import Glance from "./Glance.vue";
import EmergencySpending from "./EmergencySpending.vue";
import InteractiveMonth from "./InteractiveMonth.vue";
import InteractiveIncome from "./InteractiveIncome.vue";

export default {
  components: {
    Glance,
    EmergencySpending,
    InteractiveMonth,
    InteractiveIncome,
  },
  data(): {
    months: Month[];
    incomes: Income[];
    glance: null | Glance;
    emergency: null | EmergencySpending;
  } {
    return {
      months: [],
      incomes: [],
      glance: null,
      emergency: null,
    };
  },
  mounted(): void {
    fetch("ledger.json")
      .then((response) => response.json())
      .then((data) => {
        const finances = Finances.build(data);
        this.months = finances.months();
        this.incomes = finances.incomes;
        this.glance = finances.glance();
        this.emergency = finances.emergencySpending();
      });
  },
};
</script>

<template>
  <main>
    <Glance :glance="glance" v-if="glance" />
    <div v-if="emergency">
      <EmergencySpending :spending="emergency" />
    </div>
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
