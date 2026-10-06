(function(){
 app.beginUndoGroup('Tsutawatari Promo');
 var files = new Folder('/Users/matsudam/lab/sandbox/rope/app/video/frames').getFiles('frame-*.jpg');
 files.sort(function(a,b){return a.name < b.name ? -1 : 1;});
 var opts = new ImportOptions(files[0]); opts.sequence = true; opts.forceAlphabetical = true;
 var footage = app.project.importFile(opts);
 var comp = app.project.items.addComp('Tsutawatari Promo',1080,1920,1,30,30);
 comp.layers.add(footage);
 var audio = app.project.importFile(new ImportOptions(new File('/Users/matsudam/lab/sandbox/rope/app/video/work/music.wav')));
 comp.layers.add(audio);
 var item = app.project.renderQueue.items.add(comp); item.timeSpanStart=0; item.timeSpanDuration=30;
 item.outputModule(1).file = new File('/Users/matsudam/lab/sandbox/rope/app/video/tsutawatari-promo.mov');
 app.project.save(new File('/Users/matsudam/lab/sandbox/rope/app/video/promo.aep'));
 app.project.renderQueue.render();
 app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
})();
