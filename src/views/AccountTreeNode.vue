<script setup lang="ts">
defineProps<{
  node: TreeNode;
  openRecursively: boolean;
  openExpanded: boolean;
}>();
</script>

<script lang="ts">
import _ from "lodash";

export class TreeNode {
  constructor(
    public readonly name: string,
    public readonly path: string,
    public readonly children: Scope = {}
  ) {}
}

export type Scope = { [index: string]: TreeNode };

export default {
  name: "AccountTreeNode",
  data(): { expanded: boolean } {
    return { expanded: this.openExpanded };
  },
  methods: {
    onClick() {
      if (!this.isLeaf()) {
        this.expanded = !this.expanded;
      }
    },
    isLeaf(): boolean {
      return Object.keys(this.node.children).length == 0;
    },
    openChild(child: TreeNode): boolean {
      if (this.openRecursively) {
        return (
          Object.keys(this.node.children).length == 1 ||
          Object.keys(child.children).length == 1
        );
      }
      return false;
    },
  },
};
</script>

<template>
  <div class="tree-node">
    <div class="children" v-if="expanded && !isLeaf()">
      <AccountTreeNode
        v-for="child in node.children"
        v-bind:key="child.name"
        :node="child"
        :open-expanded="openChild(child)"
        :open-recursively="true"
      >
        <template #path="{ path }">
          <slot name="path" :path="path" />
        </template>
        <template #leaf="{ path }">
          <slot name="leaf" :path="path" />
        </template>
      </AccountTreeNode>
    </div>
    <div class="node-name" @click="onClick" v-else>
      <slot name="leaf" :path="node.path" v-if="isLeaf()"></slot>
      <slot name="path" :path="node.path" v-else></slot>
    </div>
  </div>
</template>

<style scoped>
.tree-node {
  cursor: pointer;
}
</style>
