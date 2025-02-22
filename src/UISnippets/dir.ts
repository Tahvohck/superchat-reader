import {E} from "jsr:@nfnitloop/deno-embedder@1.6.1/embed.ts"

export default E({
  "button.html": () => import("./_button.html.ts"),
  "checkbox.html": () => import("./_checkbox.html.ts"),
  "slider.html": () => import("./_slider.html.ts"),
  "textbox.html": () => import("./_textbox.html.ts"),
})
