<img src="imgs/structuredsearch_logo.png" alt="StructuredSearch logo" width="100" height="100" align="right" />

# StructuredSearch

Powered by [Chemaxon](https://chemaxon.com)

## 依赖

- [pubchem](https://pubchem.ncbi.nlm.nih.gov)
- [nmrdb](https://www.nmrdb.org)
- [molview](https://molview.org)

> [!tip]
> DrugBank exact和Wikipedia跳转链接来自PubChem JSON

- [drugbank](https://go.drugbank.com)
- [wikipedia](https://en.wikipedia.org)

## 预览

![StructuredSearch](imgs/structuredsearch.png)

## 功能

- smiles与结构式互相转换
- Example:
    - Benzyl titanium (苄钛)
    - Pregabalin (普瑞巴林)
    - Fluoxetine (氟西汀)
- Clear
- Copy
- Get:
    - CAS
    - (IUPAC)Name
    - Molecular Formula (分子式)
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

## 更多

- [KetchKekuleSearch](https://github.com/biantailab/KetchKekuleSearch) - 基于Ketcher和Kekule.js从分子结构中搜索化合物信息