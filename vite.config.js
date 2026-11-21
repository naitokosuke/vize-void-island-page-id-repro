import { voidVue } from "@void/vue/plugin";
import { defineConfig } from "@vizejs/vite-plugin/vite-plus";
import { voidPlugin } from "void";

export default defineConfig({
  plugins: [voidPlugin(), voidVue()],
}).withVue({});
