<img src="imgs/structuredsearch_logo.png" alt="StructuredSearch logo" width="100" height="100" align="right" />

# StructuredSearch

<p align="center">
    简体中文 | <a href="README_en.md">English</a>
</p>

基于Marvin JS分子草图面板和网络服务的从分子结构搜索化合物信息

Powered by [Chemaxon](https://chemaxon.com)

## 依赖

- [pubchem](https://pubchem.ncbi.nlm.nih.gov) - 数据源
- [molview](https://molview.org) - 3D可视化
- [molscribe](https://huggingface.co/spaces/yujieq/MolScribe) - 分子图像识别
- [netlify](https://netlify.com) + [neon](https://neon.com) - 短链服务

## 搜索目标

> [!tip]
> DrugBank exact和Wikipedia跳转链接来自PubChem JSON

- [nmrdb](https://www.nmrdb.org)
- [pubchem](https://pubchem.ncbi.nlm.nih.gov)
- [wikipedia](https://en.wikipedia.org)
- [drugbank](https://go.drugbank.com)

## 预览

![StructuredSearch](imgs/structuredsearch.png)

## 功能

- smiles与结构式互相转换
- URL传入
    - smiles https://structuredsearch.pages.dev/?smiles=CCCCCCCCC=O
    - cas https://structuredsearch.pages.dev/?cas=124-19-6
- Example:
    - Benzyl titanium (苄钛)
    - Quinine (奎宁)
    - Norfloxacin (诺氟沙星)
- Image将分子图像转换为smiles
- Clear
- Copy
- Get:
    - CAS
    - (IUPAC)Name
        - 当pubchem数据库中存在该化合物则直接获取
        - 当pubchem数据库中不存在该化合物则通过marvinjs的命名服务获取
    - Molecular Formula (分子式)
    - (Short SMILES)Link
    - CAS Link
- 3D可视化
    - 可与结构式，smiles进行实时更新
    - 种类
        | ![ball](imgs/ball.png) | ![stick](imgs/stick.png) | ![vdw](imgs/vdw.png) | ![wireframe](imgs/wireframe.png) |
        |---|---|---|---|
- HNMR搜索
- PubChem搜索
- Wikipedia搜索
- DrugBank搜索
    - exact (详细)
    - fuzzy (模糊)

## 历史版本

- 基于外部网络服务的版本 [cloudflare pages](https://structuresearch.pages.dev) / [netlify pages](https://structuresearch.netlify.app)
- 基于内部网络服务的版本 [cloudflare pages](https://structursearch.pages.dev) / [netlify pages](https://structursearch.netlify.app)

## 更多

- [KetcherSearch](https://github.com/biantailab/KetcherSearch) - 基于Ketcher的纯前端实现smiles⇄mol的从分子结构中搜索化合物信息