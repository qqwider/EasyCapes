package me.qoofix.easycapes;

import net.fabricmc.api.ModInitializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class EasyCapesMod implements ModInitializer {
    public static final Logger LOGGER = LoggerFactory.getLogger("easycapes");
    public static final String VERSION = /*$ mod_version*/ "0.1.0";

    @Override
    public void onInitialize() {
        LOGGER.info("EasyCapes {} initialized", VERSION);
    }
}
