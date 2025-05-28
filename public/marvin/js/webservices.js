// Define the default location of webservices

function getDefaultServicesPrefix() {
    var servername = "https://chem.smiles.ip-ddns.com"; //var servername = "http://dev.swissparam.ch:8080";
    var webapp = "";
    return servername + webapp;
}

function getDefaultServices() {
    var base = getDefaultServicesPrefix();
    var services = {
        "clean2dws": base + "/rest-v1/util/convert/clean",
        //			"clean3dws" : base + "/rest-v1/util/convert/clean",
        "molconvertws": base + "/rest-v1/util/calculate/molExport",
        "stereoinfows": base + "/rest-v1/util/calculate/cipStereoInfo",
        //			"reactionconvertws" : base + "/rest-v1/util/calculate/reactionExport",
        //			"hydrogenizews" : base + "/rest-v1/util/convert/hydrogenizer",
        //			"automapperws" : base + "/rest-v1/util/convert/reactionConverter",
        "aromatizews": base + "/rest-v1/util/calculate/molExport"
    };
    return services;
}