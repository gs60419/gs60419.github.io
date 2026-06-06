package com.goofy.mcbookeditor;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

// ── 26.1 Mojang 原名 imports ─────────────────────────────────────────────────
import net.minecraft.client.Minecraft;                                  // 原 MinecraftClient
import net.minecraft.network.chat.Component;                            // 原 Text
import net.minecraft.network.protocol.game.ServerboundEditBookPacket;  // 原 BookUpdateC2SPacket
import net.minecraft.world.InteractionHand;                             // 原 Hand
import net.minecraft.world.item.Items;                                  // 路徑同

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

public class BookFiller {

    private static final Gson GSON = new Gson();

    public static void tryFillBook(Minecraft client) {   // 原 MinecraftClient → Minecraft
        if (client.player == null || client.getConnection() == null) return;

        // ── 1. 偵測手持哪隻手拿著書與筆 ────────────────────────────────────
        InteractionHand hand = detectBookHand(client);   // 原 Hand → InteractionHand
        if (hand == null) {
            sendActionBar(client, "§c[書本編輯器] 請手持「書與筆」再按快捷鍵！");
            return;
        }

        // ── 2. 找 .mcbooks 資料夾 ──────────────────────────────────────────
        Path booksDir = client.gameDirectory.toPath().resolve("mcbooks");
        // 26.1：runDirectory → gameDirectory
        File dir = booksDir.toFile();

        if (!dir.exists()) {
            dir.mkdirs();
            sendChat(client,
                "§e[書本編輯器] 已建立資料夾：§f.minecraft/mcbooks/\n" +
                "§e請將 .mcbook 檔案放入後再按快捷鍵。");
            return;
        }

        File[] candidates = dir.listFiles((d, name) -> name.endsWith(".mcbook"));
        if (candidates == null || candidates.length == 0) {
            sendChat(client,
                "§c[書本編輯器] 找不到 .mcbook 檔案！\n" +
                "§c請將編輯器匯出的 .mcbook 放入 §f.minecraft/mcbooks/ §c資料夾。");
            return;
        }

        // 選最新修改的那個
        File target = Arrays.stream(candidates)
                .max(Comparator.comparingLong(File::lastModified))
                .orElseThrow();

        // ── 3. 解析並傳送 ────────────────────────────────────────────────
        try {
            McBookData data = parseBookFile(target);
            if (data.pages == null || data.pages.isEmpty()) {
                sendActionBar(client, "§c[書本編輯器] 書本沒有頁面內容！");
                return;
            }
            sendBookPacket(client, hand, data);

            String title   = (data.title != null) ? data.title : target.getName();
            int    pgCount = Math.min(data.pages.size(), 100);
            sendActionBar(client,
                "§a[書本編輯器] 已填入《" + title + "》§7(" + pgCount + " 頁)");

        } catch (IOException e) {
            McBookEditorMod.LOGGER.error("[McBookEditor] 讀取失敗：{}", target.getName(), e);
            sendChat(client, "§c[書本編輯器] 讀取失敗：" + e.getMessage());
        } catch (Exception e) {
            McBookEditorMod.LOGGER.error("[McBookEditor] 意外錯誤", e);
            sendChat(client, "§c[書本編輯器] 發生錯誤：" + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    private static InteractionHand detectBookHand(Minecraft client) {
        if (client.player.getMainHandItem().is(Items.WRITABLE_BOOK))  return InteractionHand.MAIN_HAND;
        if (client.player.getOffhandItem().is(Items.WRITABLE_BOOK))   return InteractionHand.OFF_HAND;
        // 26.1 Mojang 名：getMainHandItem / getOffhandItem，is() 取代 isOf()
        return null;
    }

    private static McBookData parseBookFile(File file) throws IOException {
        try (FileReader reader = new FileReader(file, StandardCharsets.UTF_8)) {
            return GSON.fromJson(reader, McBookData.class);
        }
    }

    private static void sendBookPacket(Minecraft client, InteractionHand hand, McBookData data) {
        // 主手 slot 0-8，副手 slot 40
        int slot = (hand == InteractionHand.MAIN_HAND)
                ? client.player.getInventory().selected    // 26.1：selectedSlot → selected
                : 40;

        List<String> pageJsonStrings = new ArrayList<>();
        int limit = Math.min(data.pages.size(), 100);
        for (int i = 0; i < limit; i++) {
            pageJsonStrings.add(pageToJsonString(data.pages.get(i)));
        }

        // ServerboundEditBookPacket：原 BookUpdateC2SPacket，constructor 簽名相同
        client.getConnection().send(                       // 26.1：sendPacket → send
            new ServerboundEditBookPacket(slot, pageJsonStrings, Optional.empty())
        );
    }

    /**
     * 把一頁的 TextComponent 清單轉成 Minecraft JSON text component 字串。
     * 格式：["", {comp1}, {comp2}, ...]
     */
    private static String pageToJsonString(List<McBookData.TextComponent> components) {
        if (components == null || components.isEmpty()) return "{\"text\":\"\"}";

        JsonArray arr = new JsonArray();
        arr.add("");    // 根節點空字串（MC 標準格式）

        for (McBookData.TextComponent c : components) {
            if (c.text == null) continue;

            if (c.text.contains("\n")) {
                String[] parts = c.text.split("\n", -1);
                for (int i = 0; i < parts.length; i++) {
                    if (!parts[i].isEmpty()) arr.add(buildJsonComponent(parts[i], c));
                    if (i < parts.length - 1) {
                        JsonObject nl = new JsonObject();
                        nl.addProperty("text", "\n");
                        arr.add(nl);
                    }
                }
            } else {
                arr.add(buildJsonComponent(c.text, c));
            }
        }

        return arr.toString();
    }

    private static JsonObject buildJsonComponent(String text, McBookData.TextComponent fmt) {
        JsonObject obj = new JsonObject();
        obj.addProperty("text", text);
        if (Boolean.TRUE.equals(fmt.bold))          obj.addProperty("bold",          true);
        if (Boolean.TRUE.equals(fmt.italic))        obj.addProperty("italic",        true);
        if (Boolean.TRUE.equals(fmt.underlined))    obj.addProperty("underlined",    true);
        if (Boolean.TRUE.equals(fmt.strikethrough)) obj.addProperty("strikethrough", true);
        if (fmt.color != null && !fmt.color.isEmpty()) obj.addProperty("color", fmt.color);
        return obj;
    }

    private static void sendActionBar(Minecraft client, String msg) {
        if (client.player != null)
            client.player.displayClientMessage(Component.literal(msg), true);
        // 26.1：sendMessage(Text, bool) → displayClientMessage(Component, bool)
    }

    private static void sendChat(Minecraft client, String msg) {
        if (client.player != null)
            client.player.displayClientMessage(Component.literal(msg), false);
    }
}
