const url = require('url')
let a = url.parse('https://m.qidian.com/majax/category/list?_csrfTokenaYl8SsuWCkeOTZml73GOIuUIdiUBsNFNum7WGG71&gendermale&pageNum2&orderBy&catId21&subCatId73')
let c = {
    protocol: 'https:',
    slashes: true,
    auth: null,
    host: 'm.qidian.com',
    port: null,
    hostname: 'm.qidian.com',
    hash: null,
    search: `?_csrfToken${123}&${'gender'+'male'}&pageNum${1}&orderBy&catId${33}&subCatId${23}`,
    query: `_csrfToken${123}&gender${'male'}&pageNum${1}&orderBy&catId${33}&subCatId${23}`,
    pathname: '/majax/category/list',
    path: '/majax/category/list?_csrfTokenaYl8SsuWCkeOTZml73GOIuUIdiUBsNFNum7WGG71&gendermale&pageNum2&orderBy&catId21&subCatId73',
    href: 'https://m.qidian.com/majax/category/list?_csrfTokenaYl8SsuWCkeOTZml73GOIuUIdiUBsNFNum7WGG71&gendermale&pageNum2&orderBy&catId21&subCatId73'
}
let b = url.format(c)
console.log(a, b)
