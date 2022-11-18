import {
  Context,
  DdcItem,
  DdcOptions,
} from "https://deno.land/x/ddc_vim@v3.2.0/types.ts";
import { BaseUi } from "https://deno.land/x/ddc_vim@v3.2.0/base/ui.ts";
import {
  autocmd,
  Denops,
  fn,
  op,
  vars,
} from "https://deno.land/x/ddc_vim@v3.2.0/deps.ts";

export type Params = {
  overwriteCompleteopt: boolean;
};

export class Ui extends BaseUi<Params> {
  async onInit(args: {
    denops: Denops;
  }) {
    await autocmd.group(
      args.denops,
      "ddc-ui-native",
      (helper: autocmd.GroupHelper) => {
        helper.define(
          "CompleteDone",
          "*",
          "call ddc#ui#native#_on_complete_done()",
        );
      },
    );
  }

  async skipCompletion(args: {
    denops: Denops;
  }): Promise<boolean> {
    // Check for CompleteDone
    return await vars.g.get(
      args.denops,
      "ddc#ui#native#_skip_complete",
      false,
    ) as boolean;
  }

  async show(args: {
    denops: Denops;
    context: Context;
    options: DdcOptions;
    completePos: number;
    items: DdcItem[];
    uiParams: Params;
  }): Promise<void> {
    // Check indentkeys.
    // Note: re-indentation does not work for native popupmenu
    const indentkeys = (await op.indentkeys.getLocal(args.denops)).split(",");
    const mode = await fn.mode(args.denops);
    if (
      mode == "i" &&
      indentkeys.filter((pattern) => pattern == "!^F").length > 0
    ) {
      const checkInput = args.context.input.replace(/^\s+/, '');
      for (
        const found of indentkeys.map((p) => p.match(/^0?=~?(.+)$/))
      ) {
        if (!found) {
          continue;
        }

        // Skip completion and reindent if matched.
        // NOTE: fn.feedkeys(args.denops, "\<C-f>", "n") does not work
        const checkHead = found[0][0] == '0';
        if (checkHead && checkInput == found[1]) {
          await args.denops.call("ddc#ui#native#_indent_current_line");
          return;
        }
        if (!checkHead && checkInput.endsWith(found[1])) {
          await args.denops.call("ddc#ui#native#_indent_current_line");
          return;
        }
      }
    }

    await args.denops.call(
      "ddc#ui#native#_show",
      args.context.event != "Manual" && args.uiParams.overwriteCompleteopt,
      args.completePos,
      args.items,
    );
  }

  async hide(args: {
    denops: Denops;
  }): Promise<void> {
    await args.denops.call("ddc#ui#native#_hide");
  }

  params(): Params {
    return {
      overwriteCompleteopt: true,
    };
  }
}
