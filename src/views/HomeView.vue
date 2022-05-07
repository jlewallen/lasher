<script lang="ts">
import _ from "lodash";
import { Month, Finances } from "@/model";

import InteractiveMonth from "@/components/InteractiveMonth.vue";

export default {
  components: { InteractiveMonth },
  data(): {
    months: Month[];
  } {
    return {
      months: [],
    };
  },
  mounted(): void {
    fetch("jacob.json")
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        const finances = Finances.build(data);
        this.months = finances.months();
      });
  },
};
</script>

<template>
  <main>
    <div class="months">
      <div v-for="month in months" v-bind:key="month.key">
        <InteractiveMonth :month="month" />
      </div>
    </div>
  </main>
</template>
