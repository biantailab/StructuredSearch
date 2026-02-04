<img src="imgs/logo.png" alt="StructuredSearch logo" width="100" height="100" align="right" />

# StructuredSearch

<p align="center">
    简体中文 | <a href="README_en.md">English</a>
</p>

基于Marvin JS分子草图面板和网络服务的从分子结构搜索化合物信息

Powered by [Chemaxon](https://chemaxon.com)

## 依赖

- 数据源
    - [pubchem](https://pubchem.ncbi.nlm.nih.gov)
- 分子图像识别
    - [molscribe](https://huggingface.co/spaces/yujieq/MolScribe)
- 短链服务
    - [cloudflare](https://www.cloudflare.com)
    - [netlify](https://netlify.com) + [neon](https://neon.com)

## 搜索目标

> [!tip]
> DrugBank exact和Wikipedia跳转链接来自PubChem JSON

- [nmrdb](https://www.nmrdb.org)
- [pubchem](https://pubchem.ncbi.nlm.nih.gov)
- [wikipedia](https://en.wikipedia.org)
- [drugbank](https://go.drugbank.com)

## 预览

![demo](imgs/demo.png)

## 功能

- SMILES与结构式互相转换
- URL传入
    - SMILES https://structuredsearch.pages.dev/?smiles=CCCCCCCCC=O
    - CAS https://structuredsearch.pages.dev/?cas=124-19-6
- `Example:`
    - `Benzyl titanium` 苄钛
    - `Quinine` 奎宁
    - `Norfloxacin` 诺氟沙星
- `Image` 将分子图像转换为SMILES
- `Clear`
- `Copy`
- `Get:`
    - `CAS`
    - `Name` IUPAC名称
        - 当pubchem数据库中存在该化合物则直接获取
        - 当pubchem数据库中不存在该化合物则通过Marvin JS的命名服务获取
    - `Formula` 分子式
    - `Link` 短的SMILES链接
    - `CAS Link`
- `HNMR`
- `PubChem`
- `Wikipedia`
- `DrugBank`
    - `exact` 精确搜索
    - `fuzzy` 模糊、结构、相似搜索

## 其他版本

- 基于外部网络服务的版本 [cloudflare pages](https://structuresearch.pages.dev) / [netlify pages](https://structuresearch.netlify.app)
- 基于内部网络服务的版本 [cloudflare pages](https://structursearch.pages.dev) / [netlify pages](https://structursearch.netlify.app)

## 更多

- [KetcherSearch](https://github.com/biantailab/KetcherSearch) - 基于Ketcher的纯前端实现SMILES⇄mol的从分子结构中搜索化合物信息