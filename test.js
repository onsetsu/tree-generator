// simple test for LabelGenerator
for(let i of [0,1,2,3,4,5,6,7,8,9]) {
    console.log(LabelGenerator.generate([['foo'], ['bar'], ['blub'], ['omg', 'baz']]));
    console.log(LabelGenerator.generate());
}

// the LabelGenerator.generate example from its documentation
const label = LabelGenerator.generate([
    ['Hello', 'World'],
    ['Foo', 'Bar'],
    ['Blub', 'Baz']
 ]);
console.log( label); // e.g. 'HelloBarBaz'

console.log(new TreeGenerator().createJSON());
