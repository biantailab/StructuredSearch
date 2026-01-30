<img src="imgs/structuredsearch_logo.png" alt="StructuredSearch logo" width="100" height="100" align="right" />

# StructuredSearch

<p align="center">
    <a href="README.md">简体中文</a> | English
</p>

Searching compound information from molecular structures using the Marvin JS molecular sketch panel and webservices

Powered by [Chemaxon](https://chemaxon.com)

## Dependencies

- [pubchem](https://pubchem.ncbi.nlm.nih.gov) - Data source
- [molview](https://molview.org) - 3D visualization
- [molscribe](https://huggingface.co/spaces/yujieq/MolScribe) - Molecular image recognition
- [netlify](https://netlify.com) + [neon](https://neon.com) - short url service

## Search target

> [!tip]
> DrugBank exact and Wikipedia jump links from PubChem JSON

- [nmrdb](https://www.nmrdb.org)
- [pubchem](https://pubchem.ncbi.nlm.nih.gov)
- [wikipedia](https://en.wikipedia.org)
- [drugbank](https://go.drugbank.com)

## Demo

![StructuredSearch](imgs/structuredsearch.png)

## Functionality

- Real-time conversion of smiles and mol
- URL input
    - smiles https://structuredsearch.pages.dev/?smiles=CCCCCCCCC=O
    - cas https://structuredsearch.pages.dev/?cas=124-19-6
- Example:
    - Benzyl titanium
    - Quinine
    - Norfloxacin
- Image molecular image to smiles
- Clear smiles
- Copy smiles
- Get:
    - CAS
    - IUPACName
        - If the compound exists in the PubChem database, it is acquire directly
        - If the compound does not exist in the PubChem database, it is obtained through MarvinJS's naming service
    - Molecular Formula
    - (Short SMILES)Link
    - CAS Link
- 3D visualization
    - supports real-time updates with mol and smiles
    - types
        | ![ball](imgs/ball.png) | ![stick](imgs/stick.png) | ![vdw](imgs/vdw.png) | ![wireframe](imgs/wireframe.png) |
        |---|---|---|---|
- HNMR search
- PubChem search
- Wikipedia search
- DrugBank search
    - exact
    - fuzzy

## Historical versions

- Version based on external web services [cloudflare pages](https://structuresearch.pages.dev) / [netlify pages](https://structuresearch.netlify.app)
- Version based on internal web services [cloudflare pages](https://structursearch.pages.dev) / [netlify pages](https://structursearch.netlify.app)

## More

- [KetcherSearch](https://github.com/biantailab/KetcherSearch) - Pure front-end implementation of smiles⇄mol based on Ketcher Searching for compound information from molecular structures
