<script lang="ts">
import _ from "lodash";
import { Finances, Month, Glance } from "@/model";

import Glance from "./Glance.vue";
import InteractiveMonth from "./InteractiveMonth.vue";

export default {
  components: { Glance, InteractiveMonth },
  data(): {
    months: Month[];
    glance: null | Glance;
  } {
    return {
      months: [],
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
        this.glance = finances.glance();
        this.savingsBurden = finances.savingsBurden();
      });
  },
};
</script>

<template>
  <main>
    <Glance :glance="glance" v-if="glance" />
    <div class="months">
      <div v-for="(month, i) in months" v-bind:key="month.key">
        <InteractiveMonth :month="month" :open-expanded="i == 0" />
      </div>
    </div>
  </main>
</template>
