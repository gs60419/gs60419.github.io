package com.goofy.mcbookeditor;

import java.util.List;

/**
 * .mcbook 檔案的資料結構，對應 Goofy Toymaker 編輯器匯出的 JSON 格式。
 */
public class McBookData {

    public int                      version;
    public String                   title;
    public String                   author;
    public List<List<TextComponent>> pages;   // 每一頁是一個 TextComponent 陣列

    public static class TextComponent {
        public String  text;
        public Boolean bold;
        public Boolean italic;
        public Boolean underlined;
        public Boolean strikethrough;
        public String  color;          // Minecraft 顏色名稱，例如 "red"、"gold"
    }
}
