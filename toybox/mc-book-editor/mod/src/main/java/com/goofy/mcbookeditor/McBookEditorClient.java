package com.goofy.mcbookeditor;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.api.EnvType;
import net.fabricmc.api.Environment;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
// 26.1：KeyBindingHelper → KeyMappingHelper，package 也換了
import net.fabricmc.fabric.api.client.keymapping.v1.KeyMappingHelper;

// 26.1 Mojang 原名
import net.minecraft.client.KeyMapping;                     // 原 KeyBinding
import net.minecraft.util.Identifier;                       // 26.1：ResourceLocation → Identifier（net.minecraft.util）
import com.mojang.blaze3d.platform.InputConstants;          // 原 InputUtil
import org.lwjgl.glfw.GLFW;

@Environment(EnvType.CLIENT)
public class McBookEditorClient implements ClientModInitializer {

    public static KeyMapping FILL_BOOK_KEY;   // 原 KeyBinding → KeyMapping

    // 26.1：Category 改為物件，不再是翻譯字串；ResourceLocation → Identifier
    private static final KeyMapping.Category CATEGORY =
        KeyMapping.Category.register(
            Identifier.of(McBookEditorMod.MOD_ID, "general")
        );

    @Override
    public void onInitializeClient() {

        // 快捷鍵預設 B，可在「選項 → 控制 → 麥塊書本編輯器」更改
        FILL_BOOK_KEY = KeyMappingHelper.registerKeyMapping(new KeyMapping(
            "key.mcbookeditor.fill",
            InputConstants.Type.KEYSYM,
            GLFW.GLFW_KEY_B,
            CATEGORY
        ));

        // END_CLIENT_TICK 在 26.1 沒有被重新命名（只有 World/Level tick 改名）
        ClientTickEvents.END_CLIENT_TICK.register(client -> {
            while (FILL_BOOK_KEY.consumeClick()) {
                if (client.screen == null) {          // 不在任何 GUI 畫面時才觸發
                    BookFiller.tryFillBook(client);
                }
            }
        });
    }
}
