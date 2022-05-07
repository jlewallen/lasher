<script setup lang="ts">
defineProps<{
  accounts: string[];
  openExpanded: boolean;
}>();
</script>

<script lang="ts">
import _ from "lodash";
import type { Scope } from "./AccountTreeNode.vue";
import AccountTreeNode, { TreeNode } from "./AccountTreeNode.vue";

export default {
  components: {
    AccountTreeNode,
  },
  data(): { root: TreeNode } {
    const root = new TreeNode("", "");
    const tree = this.accounts.reduce((previous: Scope, account: string) => {
      const inserted = account.split(":").reduce(
        (prev: { scope: Scope; path: string }, part: string) => {
          const path: string =
            prev.path.length == 0 ? part : prev.path + ":" + part;
          if (!(part in prev.scope)) {
            prev.scope[part] = new TreeNode(part, path);
          }
          return { scope: prev.scope[part].children, path: path };
        },
        { scope: previous, path: "" }
      );
      return previous;
    }, root.children);

    return { root: root };
  },
};
</script>

<template>
  <div class="account-tree">
    <AccountTreeNode
      :node="root"
      :open-expanded="true"
      :open-recursively="openExpanded"
    >
      <template #path="{ path }">
        <slot name="path" :path="path" />
      </template>
      <template #leaf="{ path }">
        <slot name="leaf" :path="path" />
      </template>
    </AccountTreeNode>
  </div>
</template>

<style scoped></style>
