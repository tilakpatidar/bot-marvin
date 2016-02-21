(function(){
	$(document).ready(function(){
		$(".extra_pages").css("display","none");
		$(".refresh_indicator").hide();
		var main_stats=[];
		var REFRESH_INTERVAL=8000;
		var NOTY_HIDE_DELAY=1500;
		var CREATION_DATE;
		var HEAD_TAIL='head';
		var HEAD_TAIL_LINES=0;
		var BOT_NAME='';
		var AJAX_ERROR=0;
		var SEARCH_PAGE=1;
		var SEARCH_PAGE_ACTIVE=false;
		var SEARCH_QUERY="";
		var SEARCH_PAGE_END_OF_RESULTS=false;
		var TERMINAL_CACHE=[];
		var TABLE_CACHE=[];
		var TABLES=[
	["failed_pages", "failed-pages", {
		"url": "250px",
		"Domain": "134px",
		"Content-type":"100px",
		"Bucket Id": "100px",
		"Cause": "44px",
		"Last Modified": "90px",
		"Reported By": "78px"
	},[["_id","string"],["domain","string"],["data._source.mime","string"],["hash","string"],["response","string"],["lastModified","date"],["updatedBy","string"]]],
	['crawled_pages', 'crawled-pages', {
		"url": "250px",
		"Title": "100px",
		"Domain": "134px",
		"Content":"100px",
		"Content-type":"100px",
		"Bucket Id": "100px",
		"Cause": "44px",
		"Last Modified": "90px",
		"Reported By": "78px"
	},[["_id","string"],["data._source.title","string"],["domain","string"],["data._source.body","string"],["data._source.mime","string"],["hash","string"],["response","string"],["lastModified","date"],["updatedBy","string"]]],
	["processed_buckets", "processed-buckets", {
		"Bucket id": "250px",
		"Added By": "100px",
		"Processing Bot": "100px",
		"Number of links": "134px",
		"Score": "134px",
		"Last Modified": "100px",
		"Recrawl At": "44px"
	},[["_id","string"],["insertedBy","string"],["processingBot","string"],["numOfLinks","string"],["score","string"],["lastModified","date"],["recrawlAt","date"]]],
	['total_buckets', 'total-buckets', {
		"Bucket id": "250px",
		"Added By": "100px",
		"Processing Bot": "100px",
		"Number of links": "134px",
		"Score": "134px",
		"Last Modified": "100px",
		"Recrawl At": "44px"
	},[["_id","string"],["insertedBy","string"],["processingBot","string"],["numOfLinks","string"],["score","string"],["lastModified","date"],["recrawlAt","date"]]]
];
		var TABLE_RAW_DATA='<div class="row show_###REPLACE### extra_pages"> <div class="panel-body"> <h3 class="title-hero-show-###REPLACE1###"> </h3> <div id="datatable-responsive_wrapper" class= "###REPLACE###_table wrapper dataTables_wrapper form-inline"> <div class="row"> <div class="col-sm-6"> <div class="dataTables_length" id="datatable-responsive_length"> <label><select name="datatable-responsive_length" aria-controls= "datatable-responsive" class="form-control ###REPLACE###_length"> <option value="10"> 10 </option> <option value="25"> 25 </option> <option value="50"> 50 </option> <option value="100"> 100 </option> </select> records per page</label> </div> </div> <div class="col-sm-6"> <div id="datatable-responsive_filter" class="dataTables_filter"> <label><input type="search" class="form-control" placeholder="Search..." aria-controls="datatable-responsive" /></label> </div> </div> </div> <div class="scroll-columns"><table class= "table table-striped table-bordered datatable-responsive responsive no-wrap dataTable" cellspacing="0" width="100%" role="grid" aria-describedby="datatable-responsive_info" style= "width: 100%;"> <thead> <tr class="head_row" role="row"> </tr> </thead> <tfoot class="###REPLACE###_results"> </tfoot> </table></div><div class="row"> <div class="col-sm-6"> <div class="dataTables_info ###REPLACE###_table_info" id="datatable-responsive_info" role="status" aria-live="polite"> </div> </div> <div class="col-sm-6"> <div class="dataTables_paginate paging_bootstrap" id= "datatable-responsive_paginate"> <ul class="pagination pagination_###REPLACE###"> <li class="previous disabled"><a href="#">Previous</a></li> <li class="active ###REPLACE###_1"><a href="#">1</a></li> <li><a href="#">2</a></li> <li><a href="#">3</a></li> <li><a href="#">4</a></li> <li><a href="#">5</a></li> <li class="next"><a href="#">Next</a></li> </ul> </div> </div> </div> </div> </div></div>';
		var TABLE_HEAD='<th class="sorting sort_###REPLACE3### sort_key_###REPLACE4###" tabindex="0" aria-controls="datatable-responsive" rowspan="1" colspan="1" aria-sort="ascending" aria-label= "###LABEL###: activate to sort column ascending" style="width: ###WIDTH###;">###LABEL###</th>';
		var editor;
		for (var i = 0; i < TABLES.length; i++) {
			var obj=TABLES[i];
			var temp=TABLE_RAW_DATA;
			temp=temp.replace(/###REPLACE###/g,obj[0]).replace(/###REPLACE1###/g,obj[1]);
			var t=$(temp);
			var count=0;
			for(var key in obj[2]){
				var tt=TABLE_HEAD;
				tt=tt.replace(/###REPLACE4###/g,obj[3][count]).replace(/###REPLACE3###/g,obj[0]).replace(/###LABEL###/g,key).replace(/###WIDTH###/g,obj[2][key]);
				tt=$(tt);
				t.find('.head_row').append(tt);
				++count;
			}
			$(".main_stat_page").after(t);
			$(".extra_pages").css("display","none");
		};
		
		function notification(msg,type){
				var a=[];
				msg='<i class="glyph-icon icon-refresh mrg5R"></i><span style="font-color:white;">'+msg+'</span>';
				noty({text:msg,type:type,dismissQueue:!0,theme:"agileUI",layout:"bottom"});
				
					$('.noty_message').delay(NOTY_HIDE_DELAY).fadeOut('fast',function(){
						$(this).remove();
					});

	
		}
		function getRandomColor() {
		    var letters = '0123456789ABCDEF'.split('');
		    var color = '#';
		    for (var i = 0; i < 6; i++ ) {
		        color += letters[Math.floor(Math.random() * 16)];
		    }
		    return color;
		}
		function loadMainStats(fn){
					$.ajax({
				  url: "/ask?q=main-stats",
				  crossDomain:true
				})
				  .done(function( data ) {
				      var js=JSON.parse(data);
				      main_stats.push(js["crawled_count"]);
				      for(var key in js){
				      	$("."+key+"_badge").text(js[key]);
				      };
				      fn();
				   
				  });
		}
		function loadBotsSideBar(fn){
			$(".bot_info_update").remove();
			$.ajax({
				  url: "/ask?q=active-bots",
				  crossDomain:true
				})
				  .done(function( data ) {
				      var js=JSON.parse(data);
				      $.each(js[0],function(index,element){
				      	var bots_side=$('<li class="bot_info_update"><a class="bot_name_a" href="javascript:void(0);" title=""><button class="onvoff"><i class="glyph-icon switch-icon icon-lightbulb-o".></i></button><i class="glyph-icon icon-desktop"></i>            <span class="bot_name"></span>        </a>       <div class="sidebar-submenu">            <ul class="bot_submenu"></ul></div><!-- .sidebar-submenu --></li>');
		bots_side.find('.bot_name').text(element['_id']);
				      	bots_side.find('.bot_name_a').attr("title",element["_id"]);
				      	if(element["active"]){
				      		bots_side.find('.onvoff').addClass('btn-success');
				      	}else{
				      		bots_side.find('.onvoff').addClass('btn-yellow');
				      	}
				      	bots_side.find(".bot_submenu").html("");//clear menu
				      	//	"createdBuckets":1307,"processedBuckets":282,"crawledPages":12539,"failedPages":0
				      	bots_side.find(".bot_submenu").append('<li><a href="#" class="bot_name_show_total_buckets_'+element["_id"]+'" title="Created Buckets"></span><span>Created Buckets</span><span class="bot_stats_side">'+element['createdBuckets']+'</span></a></li>');
				      	bots_side.find(".bot_submenu").append('<li><a href="#" title="Processed Buckets"><span>Processed Buckets</span><span class="bot_stats_side">'+element['processedBuckets']+'</span></a></li>');
				      	bots_side.find(".bot_submenu").append('<li><a href="#" class="bot_name_show_crawled_pages_'+element["_id"]+'" title="Crawled Pages"><span>Crawled Pages</span><span class="bot_stats_side">'+element['crawledPages']+'</span></a></li>');
				      	bots_side.find(".bot_submenu").append('<li><a href="#" class="bot_name_show_failed_pages_'+element['_id']+'" title="Failed Pages"><span>Failed Pages</span><span class="bot_stats_side">'+element['failedPages']+'</span></a></li>');
				      	bots_side.find(".bot_submenu").append('<li><a href="#" class="bot_name_edit_config_'+element['_id']+'" title="Settings"><span>Bot Config</span><span class="bot_stats_side"></span><i class="glyph-icon icon-linecons-cog sub_glyph"></i></a></li>');
				      	bots_side.find(".bot_submenu").append('<li><a href="#" title="Read Log" class="bot_name_read_log_'+element['_id']+'"><span>Read Log</span><span class="bot_stats_side"></span><i class="glyph-icon icon-file sub_glyph"></i></a></li>');
				      	bots_side.find(".bot_submenu").append('<li><a href="#" title="View Console" class="bot_name_view_console_'+element['_id']+'"><span>View Console</span><span class="bot_stats_side"></span><i class="glyph-icon icon-laptop sub_glyph"></i></a></li>');
				      	
				      	bots_side.find(".bot_name_show_total_buckets_"+element["_id"]).on('click',function(){
				      		$(".extra_pages").css("display","none");
				      		$('.total_buckets_length option[value=10]').attr('selected','selected');
				      		window.close_terminal=true;
				      		showTotalBuckets(this,0,10);
				      		return false;
				      	});
				      	bots_side.find(".bot_name_show_crawled_pages_"+element["_id"]).on('click',function(){
				      		$(".extra_pages").css("display","none");
				      		$('.crawled_pages_length option[value=10]').attr('selected','selected');
				      		window.close_terminal=true;
				      		showCrawledPages(this,0,10);
				      		return false;
				      	});
				      	bots_side.find(".bot_name_show_failed_pages_"+element["_id"]).on('click',function(){
				      		$(".extra_pages").css("display","none");
				      		$('.failed_pages_length option[value=10]').attr('selected','selected');
				      		window.close_terminal=true;
				      		showFailedPages(this,0,10);
				      		return false;
				      	});
				      	bots_side.find(".bot_name_read_log_"+element["_id"]).on('click',function(){
				      		$(".extra_pages").css("display","none");
				      		window.close_terminal=true;
				      		readLog(this);
				      		return false;
				      	});
				      	bots_side.find(".bot_name_edit_config_"+element["_id"]).on('click',function(){
				      		$(".extra_pages").css("display","none");
				      		window.close_terminal=true;
				      		editConfig(this);
				      		return false;
				      	});
				      	bots_side.find(".bot_name_view_console_"+element["_id"]).on('click',function(){
				      		window.close_terminal=true;
				      		$(".extra_pages").css("display","none");
				      		showConsole(this);
				      		return false;
				      	});
				      	$(".bot-menu-side").append(bots_side);
					      	
					      });
					if($("body").attr("class").indexOf("closed-sidebar")>=0){
						$(".onvoff").css("display","none");
						hide_onvoff=false;
					}
					fn(js[0]);
				   
				});
		}
		function loadClusterLoad(js,fn){
			var li=[];
			for (var i = 0; i < js.length; i++) {
				var d={};
				d['value']=js[i]['processedBuckets'];
				d['label']=js[i]['_id'];
				li.push(d);
				d['color']=getRandomColor();
				d['highlight']=getRandomColor();
			};
			var b=document.getElementById("chart-area").getContext("2d");
			window.myDoughnut=new Chart(b).Doughnut(li,{responsive:!0});
			fn();
		}
		function loadClusterInfo(fn){
			$.ajax({
				  url: "/ask?q=cluster-info",
				  crossDomain:true
				})
				  .done(function( data ) {
				      var js=JSON.parse(data);
				      if(CREATION_DATE===undefined){
				      	CREATION_DATE=js['createdAt'];
				      }
				      else{
				      	if(CREATION_DATE!==js['createdAt']){
				      		window.location="/";//refresh page
				      	}
				      }
				      $(".cluster_info_update").remove();
				      var b=$('<li class="cluster_info_update"><a class="cluster_name_a" href="javascript:void(0);" title=""><i class="glyph-icon icon-database"></i><span class="cluster_name">'+js['_id']+'</span><span class="small_brackets">(cluster name)</span></a></li><li class="cluster_info_update"><a class="cluster_creation_date_a" href="javascript:void(0);" title=""><i class="glyph-icon icon-calendar"></i><span class="cluster_creation_date">'+new Date(js['createdAt']).toDateString()+'</span><span class="small_brackets">(creation date)</span></a></li><li class="cluster_info_update"><a class="cluster_initiated_by_a" href="javascript:void(0);" title=""><i class="glyph-icon icon-flash"></i><span class="cluster_initiated_by">'+js['initiatedBy']+'</span><span class="small_brackets">(created by)</span></a></li><li class="cluster_info_update"><a class="cluster_add_seed_links_a" href="javascript:void(0);" title=""><i class="glyph-icon icon-plus"></i><span class="cluster_add_seed_links">Add seed links</span></a></li>');
				      b.find(".cluster_add_seed_links_a").on('click',function(){
				      	editSeed();
				      });
				      $(".cluster_info").after(b);
				      if(fn!==undefined){
				      	fn();
				      }
				   
				  });
		}
		
		loadMainStats(function(){
			loadClusterInfo(function(){
				loadBotsSideBar(function(js){
					loadClusterLoad(js,function(){
						speedGraph(function(){
								$('#loading').fadeOut( 400, "linear" );

						});

					});
					
				});				
			});

		});
		function showProcessedBuckets(t,i,j,sort_key,sort_type){
			showTable(t,i,j,"processed_buckets","processed-buckets","bot_name_show_processed_buckets_","Processed Buckets by bot :","/ask?q=get-processed-buckets",function(){return {bot_name:BOT_NAME,i:i,n:j,sort:sort_key,sort_type:sort_type};},showProcessedBuckets,function(data,page_count,ii,jj){
				notification("Buckets fetched !","success");
				      var js=data;
				      var fin=$();
				      if(Object.keys(js)!==0){
				      	for (var i = 0; i < js.length; i++) {
				      		var obj=js[i];
				      		var dum=rowGenerator(obj,TABLES[2][3],"bucket");
				      		fin=fin.add(dum);
				      	};
				      	$(".processed_buckets_results").html(fin);
				      	var up;
				      	if(page_count<=(ii+jj)){
					  		up=page_count;
					  		//also disable next paginations
					  		var start=false;
					  		$.each($(".processed_buckets_table").find(".pagination").children(),function(i,e){
					  			if(start){
					  				$(this).addClass("disabled");
					  			}
					  			if($(this).attr("class")!==undefined && $(this).attr("class").indexOf("active")>=0){
					  				
					  				start=true;
					  			}
					  			
					  		})
					  		

					  	}else{
					  		up=ii+jj;
					  	}
				      	$(".processed_buckets_table_info").text("Showing "+(ii+1)+" to "+(up)+" from "+page_count+" results.");
				      	$(".show_processed_buckets").css("display","inline");
					}
			});
		}
		function showFailedPages(t,i,j,sort_key,sort_type){
			showTable(t,i,j,"failed_pages","failed-pages","bot_name_show_failed_pages_","Failed Pages reported by bot :","/ask?q=get-failed-pages",function(){return {bot_name:BOT_NAME,i:i,n:j,sort:sort_key,sort_type:sort_type};},showFailedPages,function(data,page_count,ii,jj){
				notification("Failed pages fetched !","success");
				      var js=data;
				      var fin=$();
				      if(Object.keys(js)!==0){
				      	for (var i = 0; i < js.length; i++) {
				      		var obj=js[i];
				      		var dum=rowGenerator(obj,TABLES[0][3],"page");
				      		fin=fin.add(dum);
				      	};
				      	$(".failed_pages_results").html(fin);
				      	   	var up;
				      	if(page_count<=(ii+jj)){
					  		up=page_count;
					  		//also disable next paginations
					  		var start=false;
					  		$.each($(".failed_pages_table").find(".pagination").children(),function(i,e){
					  			if(start){
					  				$(this).addClass("disabled");
					  			}
					  			if($(this).attr("class")!==undefined && $(this).attr("class").indexOf("active")>=0){
					  				
					  				start=true;
					  			}
					  			
					  		})
					  		

					  	}else{
					  		up=ii+jj;
					  	}
				      	$(".failed_pages_table_info").text("Showing "+(ii+1)+" to "+(up)+" from "+page_count+" results.");
				      	$(".show_failed_pages").css("display","inline");
					}	
				
			});
		}
		function showCrawledPages(t,i,j,sort_key,sort_type){
			showTable(t,i,j,"crawled_pages","crawled-pages","bot_name_show_crawled_pages_","Crawled Pages reported by bot :","/ask?q=get-crawled-pages",function(){return {bot_name:BOT_NAME,i:i,n:j,sort:sort_key,sort_type:sort_type};},showCrawledPages,function(data,page_count,ii,jj){
				notification("Crawled pages fetched !","success");
				      var js=data;
				      var fin=$();
				      if(Object.keys(js)!==0){
				      	for (var i = 0; i < js.length; i++) {
				      		var obj=js[i];
				      		try{
				      			var title=obj['data']['_source']['title'];
				      		}catch(err){
				      			var title=obj['data'][1]['_source']['meta_description'].substring(0,100);
				      		}
				      		var dum=rowGenerator(obj,TABLES[1][3],"page");
				      		fin=fin.add(dum);
				      	};
				      	$(".crawled_pages_results").html(fin);
				      	var up;
				      	if(page_count<=(ii+jj)){
					  		up=page_count;
					  		//also disable next paginations
					  		var start=false;
					  		$.each($(".crawled_pages_table").find(".pagination").children(),function(i,e){
					  			if(start){
					  				$(this).addClass("disabled");
					  			}
					  			if($(this).attr("class")!==undefined && $(this).attr("class").indexOf("active")>=0){
					  				
					  				start=true;
					  			}
					  			
					  		})
					  		

					  	}else{
					  		up=ii+jj;
					  	}
				      	$(".crawled_pages_table_info").text("Showing "+(ii+1)+" to "+(up)+" from "+page_count+" results.");
				      	$(".show_crawled_pages").css("display","inline");
							
				      }
				
			});
		}
		function showTotalBuckets(t,i,j,sort_key,sort_type){
			showTable(t,i,j,"total_buckets","total-buckets","bot_name_show_total_buckets_","Buckets added by bot :","/ask?q=get-total-buckets",function(){return {bot_name:BOT_NAME,i:i,n:j,sort:sort_key,sort_type:sort_type};},showTotalBuckets,function(data,page_count,ii,jj){

				notification("Buckets fetched !","success");
			      var js=data;
			      console.log(js)
			      var fin=$();
			      if(Object.keys(js)!==0){
			      	for (var i = 0; i < js.length; i++) {
			      		var obj=js[i];
			      		var kk=obj['processingBot'];
			      		if(!kk){
			      			kk="Not processed yet";
			      		}
			      		var dum=rowGenerator(obj,TABLES[3][3],"bucket");
			      		fin=fin.add(dum);
			      	};
			      	$(".total_buckets_results").html(fin);
			      	   	var up;
				      	if(page_count<=(ii+jj)){
					  		up=page_count;
					  		//also disable next paginations
					  		var start=false;
					  		$.each($(".total_buckets_table").find(".pagination").children(),function(i,e){
					  			if(start){
					  				$(this).addClass("disabled");
					  			}
					  			if($(this).attr("class")!==undefined && $(this).attr("class").indexOf("active")>=0){
					  				
					  				start=true;
					  			}
					  			
					  		})
					  		

					  	}else{
					  		up=ii+jj;
					  	}
			      	$(".total_buckets_table_info").text("Showing "+(ii+1)+" to "+(up)+" from "+page_count+" results.");
			      	$(".show_total_buckets").css("display","inline");
						
				}
			});
		}
		function rowGenerator(obj,keys,dialog_type){
			var dum=$();
			for(var i=0;i<keys.length;i++){
				var temp=$('<th class="data_row" rowspan="1" colspan="1"></th>');
				if(keys[i][0].indexOf(".")>=0){
					//nested object
					var r=keys[i][0].split('.');
					var o=obj;
					for (var ii = 0; ii < r.length; ii++) {
						try{
							o=o[r[ii]];
						}catch(err){

						}
						
					};
					if(keys[i][1]==="date"){

						temp.text(new Date(o));
					}
					else{
						temp.text(o);
					}
				}
				else{
					if(keys[i][1]==="date"){
						temp.text(new Date(obj[keys[i][0]]));
					}
					else{
						temp.text(obj[keys[i][0]]);
					}
				}
			
				dum=dum.add(temp);
			}
			var cl="";
			if(dialog_type==="bucket"){
				cl="dialog_bucket dialog_type_bucket unique_id_"+obj['_id'];
			}
			else if(dialog_type==="page"){
				cl="dialog_page dialog_type_page unique_id_"+obj['_id'];
			}
			var t=$('<tr class="'+cl+'"></tr>');
			t.html(dum);
			return t;

		}
		function showTable(bot_name,I_TOTAL_PAGES,LEN_TOTAL_PAGES,table_name,table_name1,replacer,heading,url,data,fn1,fn){
			TABLE_CACHE=[];
			var loader=$('<div class="svg-icon-loader" style="position:absolute;bottom:-25px;left:40%;z-index:9999;top:25%;"><img src="../../assets-minified/images/svg-loaders/bars.svg" width="40" alt=""></div>');
			 $("."+table_name+"_table").append(loader);
			$(".main_stat_page").css("display","none");
			$(".back_arrow").css("display","inline");
			$(".extra_pages").css("display","none");
			BOT_NAME=$(bot_name).attr("class").split(' ')[0].replace(replacer,"");
			$(".title-hero-show-"+table_name1).html("<span>"+heading+"</span> <b>"+BOT_NAME+"</b>");
			$.ajax({
				  url: url,
				  data:data(),
				  crossDomain:true
				})
				  .done(function( data ) {
				  	$(".svg-icon-loader").remove();
				  	var d=JSON.parse(data);
				  	console.log(d)
				  	TABLE_CACHE=d["results"];
				  	var page_count=d["page_count"];
				  	if(Object.keys(d["results"]).length===0){
				  		$(".pagination_"+table_name).find(".next").addClass("disabled");
				  	}
				  	if(page_count<LEN_TOTAL_PAGES){
				  		LEN_TOTAL_PAGES=page_count;
				  	}
				  	fn(d["results"],page_count,I_TOTAL_PAGES,LEN_TOTAL_PAGES);
				   
				  });
			  
			$(".pagination_"+table_name).on('click','a',function(){
				if($(this).parent().attr("class")!==undefined && $(this).parent().attr("class")==="next"){
					//console.log($(this).parent().prev())
					var p=parseInt($(this).parent().prev().text());
					//console.log($(this).parent().parent())
					var last;
					var first=true;
					var el;
					$.each($(this).parent().parent().find("a"),function(index,element){
						try{
							console.log($(element))
							var temp=parseInt($(element).text());
							if(!Number.isNaN(temp)){
								$(element).text(temp+5)
								if(first){
									first=false;
									last=temp+5;
									el=$(element);
								}
								
							}
							
						}catch(err){

						}
						
					});
				var p=last;
				//alert(p);
				$(".pagination_"+table_name).find(".previous").removeClass("disabled");
				I_TOTAL_PAGES=(LEN_TOTAL_PAGES*p)-LEN_TOTAL_PAGES;
				$(".pagination_"+table_name).find('.active').removeClass("active");
				el.parent().addClass('active');
				$(".pagination_"+table_name).unbind('click');
				fn1($(".bot_name_show_"+table_name+"_"+BOT_NAME),I_TOTAL_PAGES,LEN_TOTAL_PAGES);
					return;
				}
				if($(this).parent().attr("class")!==undefined && $(this).parent().attr("class").indexOf("prev")>=0){
					//console.log($(this).parent().prev())
					var p=parseInt($(this).parent().next().text());
					//console.log($(this).parent().parent())
					var last;
					var el;
					$.each($(this).parent().parent().find("a"),function(index,element){
						try{
							console.log($(element))
							var temp=parseInt($(element).text());
							if(!Number.isNaN(temp)){
								$(element).text(temp-5)
								last=temp-5;
								el=$(element);
								
							}
							
						}catch(err){

						}
						
					});
				var p=last;
				if(last===5){
					$(".pagination_"+table_name).find(".previous").addClass("disabled");
				}
				//alert(p);
				$(".pagination_"+table_name).find(".next").removeClass("disabled");
				I_TOTAL_PAGES=(LEN_TOTAL_PAGES*p)-LEN_TOTAL_PAGES;
				$(".pagination_"+table_name).find('.active').removeClass("active");
				el.parent().addClass('active');
				$(".pagination_"+table_name).unbind('click');
				fn1($(".bot_name_show_"+table_name+"_"+BOT_NAME),I_TOTAL_PAGES,LEN_TOTAL_PAGES);
					return;
				}
				var p=parseInt($(this).text());
				I_TOTAL_PAGES=(LEN_TOTAL_PAGES*p)-LEN_TOTAL_PAGES;
				$(".pagination_"+table_name).find('.active').removeClass("active");
				$(this).parent().addClass('active');
				$(".pagination_"+table_name).unbind('click');
				fn1($(".bot_name_show_"+table_name+"_"+BOT_NAME),I_TOTAL_PAGES,LEN_TOTAL_PAGES);
			});
			$('.'+table_name+'_length').on("change",function(){
				LEN_TOTAL_PAGES=parseInt($( "."+table_name+"_length option:selected" ).text());
				I_TOTAL_PAGES=0;
				$(".pagination_"+table_name).find('.active').removeClass('active');
				var c=0;
				$.each($(".pagination_"+table_name).find("a"),function(index,element){
					var p=parseInt($(this).text());
					if(!Number.isNaN(p) && p!==undefined){
						$(this).text(++c);
					}
				});
				$("."+table_name+"_1").addClass('active');
				$('.'+table_name+'_length').unbind('click');
				fn1($(".bot_name_show_"+table_name+"_"+BOT_NAME),I_TOTAL_PAGES,LEN_TOTAL_PAGES);
				
			});

			$('.sort_'+table_name).on('click',function(event){
				var current_class=$(this).attr('class');
				var type;
				if(current_class.indexOf('sorting ')>=0){
					//first time
					current_class=current_class.replace('sorting ','sorting_asc ');
					type="1";
					
				}else{
					//already been set before
					if(current_class.indexOf('sorting_asc')>=0){
						current_class=current_class.replace('sorting_asc','sorting_desc');
						type="-1";
					}
					else if(current_class.indexOf('sorting_desc')>=0){
						current_class=current_class.replace('sorting_desc ','sorting ');
						
					}
				}
				var c=current_class;
				$(this).attr('class',c);
				current_class=current_class.replace('sorting','').replace('_asc','').replace('_desc','');
				var items=current_class.split('sort_key_');
				var key=items[1].trim();
				if(type===undefined){
					key=undefined;
				}
				var table_name=items[0].replace('sort_','').trim();
				$('.sort_'+table_name).unbind('click');
				fn1($(".bot_name_show_"+table_name+"_"+BOT_NAME),I_TOTAL_PAGES,LEN_TOTAL_PAGES,key,type);

			});
			
		}
		
		function readLog(bot_name){

			$(".main_stat_page").css("display","none");
			$(".back_arrow").css("display","inline");
			$(".extra_pages").css("display","none");
			BOT_NAME=$(bot_name).attr("class").replace("bot_name_read_log_","");
			$(".title-hero-read-log").html("<span>Read the log data for bot :</span> <b>"+BOT_NAME+"</b>");
			$(".read_log").css("display","inline"); 
		}
		function editSeed(bot_name){
			$(".main_stat_page").css("display","none");
			$(".back_arrow").css("display","inline");
			$(".extra_pages").css("display","none");
			$(".title-hero-edit-seed").html("");
			$.ajax({
				  url: "/ask?q=get-seed",
				  crossDomain:true
				})
				  .done(function( data ) {
				  	notification("Seed Links fetched !","success");
				      var js=JSON.parse(data);
				      if(Object.keys(js)!==0){
				      	
				      		YUI().use(
							  'aui-ace-editor',
							  function(Y) {
							    editor = new Y.AceEditor(
							      {
							        boundingBox: '#myEditor1',
							        height: '200',
							        mode: 'json',
							        value: '{}'
							      }
							    ).render();
							        editor.set('value',JSON.stringify(js, null, 2).replace(/#dot#/gi,"."));
							     	

							   
							    
							  }
							);
							$(".edit_seed").css("display","inline"); 
				      }
				   
				  });
			
		}	
		function searchData(query){
			SEARCH_PAGE_ACTIVE=true;
			
			if(SEARCH_PAGE===1){
						$(".main_stat_page").css("display","none");
						$(".back_arrow").css("display","inline");
						$(".extra_pages").css("display","none");
					var loader=$('<div class="svg-icon-loader" style="position:absolute;bottom:-25px;left:54%;z-index:9999;top:47%;"><img src="../../assets-minified/images/svg-loaders/bars.svg" width="40" alt=""></div>');
						 $("#page-content").append(loader);
			}
			else{
				var loader=$('<div class="svg-icon-loader" style="position:absolute;bottom:-25px;left:40%;z-index:9999;right:50%;"><img src="../../assets-minified/images/svg-loaders/bars.svg" width="40" alt=""></div>');
				 $(".search_results").find(".panel-body").append(loader);
			}
			$.ajax({
				  url: "/ask?q=search",
				  data:{text:query,i:SEARCH_PAGE},
				  crossDomain:true
				})
				  .done(function( data ) {
				  	if(SEARCH_PAGE===1){
						$(".main_stat_page").css("display","none");
						$(".back_arrow").css("display","inline");
						$(".extra_pages").css("display","none");
				  	}
				  	
				  	notification("Data fetched !","success");
				      var js=JSON.parse(data);
				      var divs=$();
				      if(js.length===0){
				      	SEARCH_PAGE_END_OF_RESULTS=true;
				      	loader.fadeOut( 400, "linear" ,function(){
			        		$(this).remove();
			        	});
				      	return;
				      }
				      var start=$(".search_divs").length;
				      if(start===0){
				      	start=1;
				      }
				      if(SEARCH_PAGE>1){
				      	start+=1;
				      }
				      for (var i = 0; i < js.length; i++) {
				      	var obj=js[i];
				      	var t=$("<div class='search_divs hide'><div class='search_field_operation search_key_"+obj["_id"]+"'><a href='#' class='search_field'>#"+(start)+"</a><span class='search_field_span'>|</span><a href='#' class='search_field'>Update</a><span class='search_field_span'>|</span><a href='#' class='search_field'>Delete</a><span class='search_field_span'>|</span><a href='#' class='search_field search_field_expand_"+start+"'>Expand</a><span class='search_field_span'>|</span><a href='http://localhost:2020/ask?q=get-page&url="+encodeURIComponent(obj["_id"])+"' download='"+encodeURIComponent(obj["_id"])+".json' class='download_json'>Download</a></div><div class='search_results_div search_result_"+start+"'></div></div>");
				    
				     	divs=divs.add(t)
				     	++start;
				      };
				      var pager=$('<ul class="pagination pagination_search_pages"> <li class="previous disabled"><a href="#">Previous</a></li> <li class="active crawled_pages_1"><a href="#">1</a></li> <li><a href="#">2</a></li> <li><a href="#">3</a></li> <li><a href="#">4</a></li> <li><a href="#">5</a></li> <li class="next"><a href="#">Next</a></li> </ul>');
				      $(".search_results").find(".panel-body").append(divs);
				      var done=0;
				      var start=start-js.length;
				      if(start===0){
				      	start=1;
				      }
				      if(SEARCH_PAGE>1){
				      	start+=1;
				      }
				      	for (var i = 0; i < js.length; i++) {
				      		var obj=js[i];
				      		(function(obj,i){
YUI().use(
							  'aui-ace-editor',
							  function(Y) {
							    editor = new Y.AceEditor(
							      {
							        boundingBox: '.search_result_'+i,
							        height: '200',
							        mode: 'json',
							        value: '{}',
							        readOnly:true,
							        disabled:true,
							        dragEnabled:false
							      }
							    ).render();
							        editor.set('value',JSON.stringify(obj, null, 2));
							     	done+=1;
							        if(done===js.length){
							        	loader.fadeOut( 400, "linear" ,function(){
							        		$(this).remove();
							        	});

							        	$(".search_divs").removeClass("hide");
										$(".search_results").css("display","inline"); 
								      window.highlight_interval=setInterval(function(){
									    	//to rehighlight on scroll of doc
													 // console.log("heree",$(".ace_line"));
									        	$.each($(".ace_line"),function(index,element){
													var t=$(this).html();
													var temp=SEARCH_QUERY.replace(/\s/gi,"&nbsp;");
													console.log(temp);
													console.log(t.toLowerCase().indexOf(temp.toLowerCase()));
													if(t.toLowerCase().indexOf(temp.toLowerCase())>=0){
														var re=new RegExp(temp,"gi");
														var m=t.match(re);
														for (var i =0;i<m.length;i++) {
															var r=new RegExp(m[i],"i");
															t=t.replace(r,"<mark>"+m[i]+"</mark>");
															
														};
														
														$(this).html(t);
													}
												});
										      },2000);
							        }
							   
							    
							  }
							);

				      		})(obj,start);
				      		start++;
				      	};
				      	$('.search_divs').on('mousewheel', function(e) {
								        e.preventDefault();
								        e.stopPropagation();
								    
						});
						$(".search_field").on("click",function(){
							switch($(this).text()){
								case "Expand":
									var count=$(this).attr("class").replace("search_field search_field_expand_","");
									$(".search_result_"+count).find("ace_content").height(800);
									$(".search_result_"+count).find("ace_scroller").height(800);
									$(".search_result_"+count).find("ace_gutter").height(800);
									$(".search_result_"+count).height(800);
									window.dispatchEvent(new Event('resize'));
									$(this).text("Collapse");
									break;
								case "Collapse":
									var count=$(this).attr("class").replace("search_field search_field_expand_","");
									$(".search_result_"+count).find("ace_content").height(200);
									$(".search_result_"+count).find("ace_scroller").height(200);
									$(".search_result_"+count).find("ace_gutter").height(200);
									$(".search_result_"+count).height(200);
									window.dispatchEvent(new Event('resize'));
									$(this).text("Expand");
									break;

							}
							
							return false;
						});
						
				      		
				     
				   
				  });
		}
		function showConsole(bot_name,loop){
			console.log(bot_name);
			if(!loop){
				window.close_terminal=false;
				$("#window").css("display","inline");
				$(".back_arrow").css("display","inline");
				$(".main_stat_page").css("display","none");
				$(".extra_pages").css("display","none");
			}
			
			BOT_NAME=$(bot_name).attr("class").replace("bot_name_view_console_","");
				$.ajax({
				  url: "/ask?q=readTerminal",
				  data:{bot_name:BOT_NAME},
				  crossDomain:true
				})
				  .done(function( data ) {
				      var js=JSON.parse(data);
				      if(Object.keys(js)!==0){
					    TERMINAL_CACHE=TERMINAL_CACHE.concat(JSON.parse(data))
					    data=TERMINAL_CACHE.slice(TERMINAL_CACHE.length-50,TERMINAL_CACHE.length-1).join("<br/>");
				      	data=data.replace(/\[SUCCESS\]/gi,"<span class='success_log'>[SUCCESS]</span>");
					    data=data.replace(/\[ERROR\]/gi,"<span class='error_log'>[ERROR]</span>");
					    data=data.replace(/\[INFO\]/gi,"<span class='info_log'>[INFO]</span>");
					    data=data.replace(/\]/g,']&nbsp;&nbsp;');
				      	$("#terminal").html(data);
				      		
							$(".show_console").css("display","inline"); 
				      }
				      $("#title").text(BOT_NAME);
				      $("#terminal").append('<div class="cursor"></div> ');
				     if(!window.close_terminal){
					     	setTimeout(function(){
					  	showConsole($(".bot_name_view_console_"+BOT_NAME),true);
					  },1000);
				     }
				      
				   
				  });
				  
		}
		function editConfig(bot_name){
			$(".main_stat_page").css("display","none");
			$(".back_arrow").css("display","inline");
			$(".extra_pages").css("display","none");
			BOT_NAME=$(bot_name).attr("class").replace("bot_name_edit_config_","");
			$(".title-hero-edit-config").html("<span>Edit the config for bot :</span> <b>"+BOT_NAME+"</b>");
			$.ajax({
				  url: "/ask?q=get-config",
				  data:{bot_name:BOT_NAME},
				  crossDomain:true
				})
				  .done(function( data ) {
				  	notification("Config fetched !","success");
				      var js=JSON.parse(data);
				      if(Object.keys(js)!==0){
				      	
				      		YUI().use(
							  'aui-ace-editor',
							  function(Y) {
							    editor = new Y.AceEditor(
							      {
							        boundingBox: '#myEditor',
							        height: '600',
							        mode: 'json',
							        value: '{}'
							      }
							    ).render();
							        editor.set('value',JSON.stringify(js, null, 2));
							     	

							   
							    
							  }
							);
							$(".edit_config").css("display","inline"); 
				      }
				   
				  });
			
		}		
		function speedGraph(fn){
					if(main_stats.length%10===0 && main_stats.length!==0){
						main_stats.splice(0,5);//empty the list gradually
					}
				  	var js=JSON.parse(JSON.stringify(main_stats));
				  	var prev=0;
				  	var a=[];
				  	for(var i=0;i<js.length;i++){
				  		var dic=js[i];
				  		a.push([prev,Math.abs(js[i])]);
				  		prev+=REFRESH_INTERVAL;
				  	}
			var d=$.plot($("#data-example-1"),[{data:a,label:"Crawl Speed"}],{series:{shadowSize:0,lines:{show:!0,lineWidth:2},points:{show:!0}},grid:{labelMargin:10,hoverable:!0,clickable:!0,borderWidth:1,borderColor:"rgba(82, 167, 224, 0.06)"},legend:{backgroundColor:"#fff"},yaxis:{tickColor:"rgba(0, 0, 0, 0.06)",font:{color:"rgba(0, 0, 0, 0.4)"}},xaxis:{tickColor:"rgba(0, 0, 0, 0.06)",font:{color:"rgba(0, 0, 0, 0.4)"}},colors:[getUIColor("success"),getUIColor("gray")],tooltip:!0,tooltipOpts:{content:"x: %x, y: %y"}});$("#data-example-1").bind("plothover",function(a,b){$("#x").text(b.x.toFixed(2)),$("#y").text(b.y.toFixed(2))}),$("#data-example-1").bind("plotclick",function(a,b,c){c&&($("#clickdata").text("You clicked point "+c.dataIndex+" in "+c.series.label+"."),d.highlight(c.series,c.datapoint))});
						if(fn!==undefined){
							fn();
						}
						
				
				}
		speedGraph();
		function statsReloader(){
			loadMainStats(function(){
			loadBotsSideBar(function(js){
				loadClusterLoad(js,function(){
					speedGraph(function(){
							$('#loading').fadeOut( 400, "linear" );
							$(".refresh_indicator").fadeIn(400,'linear',function(){
								$(this).fadeOut( 2000, "linear" );
							});

					});
					

				});
				
			});
			});
		}
		setInterval(statsReloader,REFRESH_INTERVAL);
		setInterval(loadClusterInfo,15000);
		$(".back_arrow").on('click',function(){
			window.close_terminal=true;
			clearInterval(window.highlight_interval);
			SEARCH_PAGE_ACTIVE=false;
			$(".main_stat_page").css("display","inline");
			$(this).css('display','none');
			$(".extra_pages").css('display','none');
		});
		$('.head_tails').on("change",function(){
			var opt=$( ".head_tails option:selected" ).text();
			HEAD_TAIL=opt;//update the head_tail global value
			
		});
	
		
		$('.lines_input').on('focusout',function(){
			try{
				HEAD_TAIL_LINES=parseInt($('.lines_input').val());
			}catch(err){
				alert('Line number must be an Int');
				$('.lines_input').val("")
			}
		});
		$('.reset_json').on('click',function(){
			editConfig($(".bot_name_edit_config_"+BOT_NAME));
		});
		$('.seed_reset_json').on('click',function(){
			editSeed();
		});
		$(".update_json").on('click',function(){
			var editor = ace.edit("myEditor");
			var js=editor.getValue();
			try{
				JSON.parse(js);
			}catch(err){
				notification("Invalid JSON !","error");
				return;
			}
			$.post( "/ask?q=put-config",{data:js,bot_name:BOT_NAME})
			  .done(function() {
			  	notification("Config updated !","success");
			  })
			  .fail(function() {
			    notification("Something went wrong !","error");
			  });
		})
		$(".seed_update_json").on('click',function(){
			var editor = ace.edit("myEditor1");
			var js=editor.getValue().replace(/\./gi,"#dot#");
			try{
				JSON.parse(js);
			}catch(err){
				notification("Invalid JSON !","error");
				return;
			}
			$.post( "/ask?q=put-seed",{data:js})
			  .done(function() {
			  	notification("Seed updated !","success");
			  })
			  .fail(function() {
			    notification("Something went wrong !","error");
			  });
		})
		
		
		$(".head_tail_btn").on("click",function(){
			try{
				HEAD_TAIL_LINES=parseInt($('.lines_input').val());
			}catch(err){
				alert('Line number must be an Int');
				$('.lines_input').val("")
			}
			$.ajax({
				  url: "/ask?q=read-log",
				  data:{type:HEAD_TAIL,n:HEAD_TAIL_LINES,bot_name:BOT_NAME},
				  crossDomain:true
				})
				  .done(function( data ) {
				  	notification("Log data received !","success");
				  	data=data.replace(/\[SUCCESS\]/gi,"<span class='success_log'>[SUCCESS]</span>");
				    data=data.replace(/\[ERROR\]/gi,"<span class='error_log'>[ERROR]</span>");
				    data=data.replace(/\[INFO\]/gi,"<span class='info_log'>[INFO]</span>");
				    data=data.replace(/\]/g,']&nbsp;&nbsp;');
				    $('.log_text_area').html("").html(data.replace(/\n/gi,"<br/>"));
				   
				  });
		});
		$(".bot_name_show_crawled_pages_master").on('click',function(){
			$('.crawled_pages_length option[value=10]').attr('selected','selected');

			showCrawledPages(this,0,10);
			return false;
		});
		$(".bot_name_show_failed_pages_master").on('click',function(){
			$('.failed_pages_length option[value=10]').attr('selected','selected');
			showFailedPages(this,0,10);
			return false;
		});
		$(".bot_name_show_total_buckets_master").on('click',function(){
			$('.total_buckets_length option[value=10]').attr('selected','selected');
			showTotalBuckets(this,0,10);
			return false;
		});
		$(".bot_name_show_processed_buckets_master").on('click',function(){
			$('.processed_buckets_length option[value=10]').attr('selected','selected');
			showProcessedBuckets(this,0,10);
			return false;
		});
		var AJAX_ERROR_ENCOUNTERED=false;
		$(document).ajaxError(function( event, request, settings ) {
        //When XHR Status code is 0 there is no connection with the server
	        if (request.status == 0 && settings.url.indexOf('/ask?')>=0){ 
	        
	        	AJAX_ERROR_ENCOUNTERED=true;
	           AJAX_ERROR+=1;
	        } 
	        if(AJAX_ERROR>=3){
	        	$(".onvoff").removeClass("btn-success").addClass("btn-yellow");
	        	notification("Disconnected from server. Trying to reconnect . . .",'error');
	        	window.close();
	        	open(location, '_self').close();//closes window
	        	
	        }

	    });
	    $(".search_data").on("keypress",function(event){

	    	if(event.keyCode===13){
	    		SEARCH_PAGE_END_OF_RESULTS=false;
	    		SEARCH_PAGE=1;
	    		SEARCH_QUERY=$(this).val();
	    		$(".search_results").find(".panel-body").html("");
	    		searchData($(this).val());
	    	}
	    });
	    
	    $(window).on("scroll",function(){

	    	if(!SEARCH_PAGE_ACTIVE || SEARCH_PAGE_END_OF_RESULTS){
	    		return;
	    	}
	    	if ($(window).scrollTop() == $(document).height() - $(window).height()){
				SEARCH_PAGE+=1;
				searchData(SEARCH_QUERY);
			}
	    });
	   $(document).ajaxSuccess(function( event, request, settings ) {
        //When XHR Status code is 0 there is no connection with the server
	        if (settings.url.indexOf('/ask?')>=0 && AJAX_ERROR_ENCOUNTERED===true){ 
	        	AJAX_ERROR_ENCOUNTERED=false;
	           AJAX_ERROR=0;
	           notification("Reconnected to server. Connected . . .",'success');
	        } 
	        

	    });
	 	$(".terminal_close").on("click",function(){
	 		if(!window.close_terminal){
	 			$("#window").css("display","none");
	 			window.close_terminal=true;
	 		}
	 	});
	 	var maxim=true;
	 	$(".terminal_max").on("click",function(){
	 		if(!window.close_terminal){
	 			if(maxim){
	 				maxim=false;
	 				$("#window").css({
	 				"position": "fixed",
				    "top": "0px",
				    "left": "102px",
				    "z-index":"500"
		 			}).css("height","100%").css("width",($(window).width()-102)+"px");
		 			$("#toolbar").css("width","100%");
		 			$("body").addClass("closed-sidebar");
	 			}
	 			else{
	 				$("#window").removeAttr("style");
	 				$("#toolbar").css("width","100%");
		 			$("body").removeClass("closed-sidebar");
	 				maxim=true;
	 			}
	 			
	 		}
	 	});
	 	var hide_onvoff=true;
	 	$("#close-sidebar").on("click",function(){
	 		if(hide_onvoff){
	 			$(".onvoff").css("display","none");
	 			hide_onvoff=false;
	 		}else{
	 			$(".onvoff").css("display","inline");
	 			hide_onvoff=true;
	 		}
	 		
	 	});

			$(document).on("click",".dialog_page",function(){
				var title=$(this).attr("class").replace("dialog_page","").replace("dialog_type_page unique_id_","").trim();
				var customModal = $('<div class="modal fade display-block"> <div class="modal-dialog"> <div class="modal-content"> <div class="modal-header"> <button type="button" class="close modal_close" data-dismiss="modal" aria-hidden="true">×</button> <h4 class="modal-title">Modal title</h4> </div> <div class="modal-body"></div> <div class="modal-footer"> <button type="button" class="btn btn-default modal_close" data-dismiss="modal">Close<div class="ripple-wrapper"></div></button> </div> </div> </div> </div>');
				customModal.find(".modal-title").html("<a target='_blank' href='"+title+"'>"+title+"</a>");
				$.ajax({
				  url: "/ask?q=get-page",
				  crossDomain:true,
				  data:{url:title}
				})
				  .done(function( data ) {
				      var js=JSON.parse(data);
				      var divs=$();
				      console.log(js);
					      	var obj=js;
					      	var t=$("<div class='dialog_divs search_divs'><div class='search_field_operation search_key_"+obj["_id"]+"'><a href='#' class='search_field'>#1</a><span class='search_field_span'>|</span><a href='#' class='search_field'>Update</a><span class='search_field_span'>|</span><a href='#' class='search_field'>Delete</a><span class='search_field_span'>|</span><a href='http://localhost:2020/ask?q=get-page&url="+encodeURIComponent(title)+"' download='"+encodeURIComponent(title)+".json' class='download_json'>Download</a></div><div class='bucket_results_div bucket_result_1'></div></div>");
					     	console.log(t);
					     	
					     	
					     	divs=divs.add(t);
					      customModal.find(".modal-body").append(divs);
						$('body').append(customModal);
					   	(function(obj,i){
							YUI().use(
							  'aui-ace-editor',
							  function(Y) {
							    editor = new Y.AceEditor(
							      {
							        boundingBox: '.bucket_result_'+i,
							        height: '200',
							        mode: 'json',
							        value: '{}',
							        readOnly:true,
							        disabled:true,
							        dragEnabled:false
							      }
							    ).render();
							        editor.set('value',JSON.stringify(obj, null, 2));
							     	setTimeout(function(){
									 $(".dialog_divs").find(".ace_scrollbar-v").attr("style","display:inline !important;");
							   		$(".dialog_divs").find(".ace_scrollbar-h").attr("style","display:inline !important;");
							     	},2000)
							       
							    
							  
							}
							);
				      		})(obj,1);
					  });
				
				   
			});
			$(document).on("click",".modal_close",function(){
				$(".modal").remove();
			});
			$.ajaxQ = (function(){
			  var id = 0, Q = {};

			  $(document).ajaxSend(function(e, jqx){
			    jqx._id = ++id;
			    Q[jqx._id] = jqx;
			  });
			  $(document).ajaxComplete(function(e, jqx){
			    delete Q[jqx._id];
			  });

			  return {
			    abortAll: function(){
			      var r = [];
			      $.each(Q, function(i, jqx){
			        r.push(jqx._id);
			        jqx.abort();
			      });
			      return r;
			    }
			  };

			})();

			

			$(document).on("click",".dialog_type_bucket",function(){
				var title=$(this).attr("class").replace("dialog_bucket","").replace("dialog_type_bucket unique_id_","").trim();
				var customModal = $('<div class="modal fade display-block"> <div class="modal-dialog"> <div class="modal-content"> <div class="modal-header"> <button type="button" class="close modal_close" data-dismiss="modal" aria-hidden="true">×</button> <h4 class="modal-title">Modal title</h4> </div> <div class="modal-body"></div> <div class="modal-footer"> <button type="button" class="btn btn-default modal_close" data-dismiss="modal">Close<div class="ripple-wrapper"></div></button> </div> </div> </div> </div>');
				customModal.find(".modal-title").html("<a target='_blank' href='"+title+"'>Bucket id: "+title+"</a>");
				$.ajax({
				  url: "/ask?q=get-bucket",
				  crossDomain:true,
				  data:{url:title}
				})
				  .done(function( data ) {
				      var js=JSON.parse(data);
				      var divs=$();
					      	var obj=js;
					      	var t=$("<div class='dialog_divs search_divs'><div class='search_field_operation search_key_"+obj["_id"]+"'><a href='#' class='search_field'>#1</a><span class='search_field_span'>|</span><a href='#' class='search_field'>Update</a><span class='search_field_span'>|</span><a href='#' class='search_field'>Delete</a><span class='search_field_span'>|</span><a href='http://localhost:2020/ask?q=get-page&url="+encodeURIComponent(title)+"' download='"+encodeURIComponent(title)+".json' class='download_json'>Download</a></div><div class='search_results_div search_result_1'></div></div>");
					     	
					     	
					     	
					     	divs=divs.add(t);
					      customModal.find(".modal-body").append(divs);
						$('body').append(customModal);
					   	(function(obj,i){
							YUI().use(
							  'aui-ace-editor',
							  function(Y) {
							    editor = new Y.AceEditor(
							      {
							        boundingBox: '.search_result_'+i,
							        height: '200',
							        mode: 'json',
							        value: '{}',
							        readOnly:true,
							        disabled:true,
							        dragEnabled:false
							      }
							    ).render();
							        editor.set('value',JSON.stringify(obj, null, 2));
							     	setTimeout(function(){
									 $(".dialog_divs").find(".ace_scrollbar-v").attr("style","display:inline !important;");
							   		$(".dialog_divs").find(".ace_scrollbar-h").attr("style","display:inline !important;");
							     	},2000)
							       
							    
							  
							}
							);
				      		})(obj,1);
					  });
			})

		});
})();