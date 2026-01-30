function getDefaultServicesPrefix() {
    return ""; 
}

function getDefaultServices() {
    var base = getDefaultServicesPrefix();
    var services = {
        "clean2dws": base + "/rest-v1/util/convert/clean",
        // "clean3dws" : base + "/rest-v1/util/convert/clean",
        "molconvertws": base + "/rest-v1/util/calculate/molExport",
        "stereoinfows": base + "/rest-v1/util/calculate/cipStereoInfo", // Calculate stereo
        // "reactionconvertws" : base + "/rest-v1/util/calculate/reactionExport",
        "hydrogenizews" : base + "/rest-v1/util/convert/hydrogenizer", // Add/Remove explicit H
        // "automapperws" : base + "/rest-v1/util/convert/reactionConverter", // Auto Map
        // "aromatizews": base + "/rest-v1/util/calculate/molExport" // Aromatize/dearomatize
    };
    return services;
}