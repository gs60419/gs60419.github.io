package com.goofy.mcbookeditor;

import net.fabricmc.api.ModInitializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class McBookEditorMod implements ModInitializer {

    public static final String MOD_ID = "mcbookeditor";
    public static final Logger LOGGER  = LoggerFactory.getLogger(MOD_ID);

    @Override
    public void onInitialize() {
        // 本 mod 只有 Client 端邏輯，這裡無需初始化
    }
}
