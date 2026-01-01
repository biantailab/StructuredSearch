(function () {
  var config = {
    serviceBackendDomain: "https://marvinjs.chemicalize.com",
    apiKey: "0bb3e0bda52f49189c286e052b0d1665",
    userDomains: [
      window.location.origin
    ],
    serviceDomain: "https://marvinjs.chemicalize.com",
    adminDomain: "https://pro.chemicalize.com"
  };

  window.ChemicalizeMarvinJsConfig = config;
  window.config = config;
})();
