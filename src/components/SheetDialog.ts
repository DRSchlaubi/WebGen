import { Component } from "../Component.ts";
import { Pointable, asPointer } from "../State.ts";
import { Pointer } from "../webgen.ts";
import { Label } from "./Label.ts";
import { Sheet, SheetsStackComponent } from "./Sheet.ts";
import { Grid } from "./Stacks.ts";

export function SheetDialog(sheetRegistry: SheetsStackComponent, title: Pointable<string>, ...content: Component[]) {
    const isOpen = asPointer(false);

    const sheet = Sheet(
        Grid(
            Grid(
                Label(title)
                    .addClass("wsheet-title")
                    .setTextSize("3xl")
                    .setFontWeight("bold")
            )
                .setAlign("end")
                .setHeight("80px"),
            ...content
        )
            .setGap()
            .setMargin("15px")
    );


    isOpen.listen((open, oldValue) => {
        if (open)
            sheetRegistry.add(sheet);
        else if (oldValue)
            sheetRegistry.remove(sheet);
    });


    return {
        open: () => isOpen.setValue(true),
        close: () => isOpen.setValue(false),
        setId: (id: string) => sheet.setId(id),
        setOnClose: (onClose: () => void) => sheet.setOnClose(onClose),
        setCanClose: (pointer: Pointer<boolean>) => sheet.setCanClose(pointer),
    };
}