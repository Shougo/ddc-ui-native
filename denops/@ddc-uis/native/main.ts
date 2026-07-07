import type { Context, DdcItem, DdcOptions } from "@shougo/ddc-vim/types";
import { BaseUi } from "@shougo/ddc-vim/ui";

import type { Denops } from "@denops/std";
import * as fn from "@denops/std/function";
import * as autocmd from "@denops/std/autocmd";
import * as op from "@denops/std/option";
import * as vars from "@denops/std/variable";

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
    // Check modifiable.
    if (!await op.modifiable.getLocal(args.denops)) {
      return;
    }

    // Check indentkeys.
    // Note: re-indentation does not work for native popupmenu
    const indentkeys = (await op.indentkeys.getLocal(args.denops)).split(",");
    const mode = await fn.mode(args.denops);
    const hasIndentKick = indentkeys.includes("!^F");
    const headIndentPatterns = indentkeys
      .map((pattern) => pattern.match(/^0?=~?(.+)$/))
      .filter((pattern): pattern is RegExpMatchArray => pattern !== null);

    if (mode == "i" && hasIndentKick && headIndentPatterns.length > 0) {
      const checkInput = args.context.input.replace(/^\s+/, "");
      for (const found of headIndentPatterns) {
        const isHeadMatch = found[0][0] == "0";
        const pattern = found[1];

        // Skip completion and reindent if matched.
        // NOTE: fn.feedkeys(args.denops, "\<C-f>", "n") does not work
        if (isHeadMatch && checkInput == pattern) {
          await args.denops.call("ddc#ui#native#_indent_current_line");
          return;
        }
        if (!isHeadMatch && checkInput.endsWith(pattern)) {
          await args.denops.call("ddc#ui#native#_indent_current_line");
          return;
        }
      }
    }

    // Convert to native items
    const items = args.items.map((item) => ({
      ...item,
      dup: true,
      equal: true,
      icase: true,
    }));

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
