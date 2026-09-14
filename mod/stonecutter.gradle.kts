plugins {
    id("dev.kikugie.stonecutter")
}

stonecutter active "1.21.11-fabric"

// See https://stonecutter.kikugie.dev/wiki/config/params
stonecutter parameters {
    constants.match(current.project.substringAfterLast('-'), "fabric", "forge", "neoforge")
    swaps["mod_version"] = "\"${property("mod.version")}\";"
    swaps["minecraft"] = "\"${node.metadata.version}\";"
    constants["release"] = property("mod.id") != "template"
}
