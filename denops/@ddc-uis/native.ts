import {
  Context,
  DdcItem,
  DdcOptions,
} from "https://deno.land/x/ddc_vim@v4.0.5/types.ts";
import { BaseUi } from "https://deno.land/x/ddc_vim@v4.0.5/base/ui.ts";
import {
  autocmd,
  Denops,
  fn,
  op,
  vars,
} from "https://deno.land/x/ddc_vim@v4.0.5/deps.ts";

export type Params = {
  insert: boolean;
  overwriteCompleteopt: boolean;
};

export class Ui extends BaseUi<Params> {
  override async onInit(args: {
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

  override async skipCompletion(args: {
    denops: Denops;
  }): Promise<boolean> {
    // Check for CompleteDone
    return await vars.g.get(
      args.denops,
      "ddc#ui#native#_skip_complete",
      false,
    ) as boolean;
  }

  override async show(args: {
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
      const checkInput = args.context.input.replace(/^\s+/, "");
      for (
        const found of indentkeys.map((p) => p.match(/^0?=~?(.+)$/))
      ) {
        if (!found) {
          continue;
        }

        // Skip completion and reindent if matched.
        // NOTE: fn.feedkeys(args.denops, "\<C-f>", "n") does not work
        const checkHead = found[0][0] == "0";
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

    // Convert to native items
    const items = args.items.map((item) => (
      {
        ...item,
        dup: true,
        equal: true,
        icase: true,
      }
    ));

    await args.denops.call(
      "ddc#ui#native#_show",
      args.context.event,
      args.context.event != "Manual" && args.uiParams.overwriteCompleteopt,
      args.uiParams.insert,
      args.completePos,
      items,
    );
  }

  override async hide(args: {
    denops: Denops;
  }): Promise<void> {
    await args.denops.call("ddc#ui#native#_hide");
  }

  override async visible(args: {
    denops: Denops;
  }): Promise<boolean> {
    return Boolean(await fn.pumvisible(args.denops));
  }

  override params(): Params {
    return {
      insert: false,
      overwriteCompleteopt: true,
    };
  }
}
