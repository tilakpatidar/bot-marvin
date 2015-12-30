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
		var TABLES=[
	["failed_pages", "failed-pages", {
		"url": "250px",
		"Domain": "134px",
		"Content-type":"100px",
		"Bucket Id": "100px",
		"Cause": "44px",
		"Last Modified": "90px",
		"Reported By": "78px"
	},["_id","domain","data._source.mime","hash","response","lastModified","updatedBy"]],
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
	},["_id","data._source.title","domain","data._source.body","data._source.mime","hash","response","lastModified","updatedBy"]],
	["processed_buckets", "processed-buckets", {
		"Bucket id": "250px",
		"Added By": "100px",
		"Processing Bot": "100px",
		"Number of links": "134px",
		"Last Modified": "100px",
		"Recrawl At": "44px"
	},["_id","insertedBy","processingBot","numOfLinks","lastModified","recrawlAt"]],
	['total_buckets', 'total-buckets', {
		"Bucket id": "250px",
		"Added By": "100px",
		"Processing Bot": "100px",
		"Number of links": "134px",
		"Last Modified": "100px",
		"Recrawl At": "44px"
	},["_id","insertedBy","processingBot","numOfLinks","lastModified","recrawlAt"]]
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
				console.log(t.find('.head_row'));
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
				  url: "/ask/q?=main-stats",
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
				  url: "/ask/q?=active-bots",
				  crossDomain:true
				})
				  .done(function( data ) {
				      var js=JSON.parse(data);
				      $.each(js[0],function(index,element){
				      	var bots_side=$('<li class="bot_info_update"><a class="bot_name_a" href="javascript:void(0);" title=""><span class="small-badge bg-azure onvoff"></span><i class="glyph-icon icon-desktop"></i>            <span class="bot_name"></span>        </a>       <div class="sidebar-submenu">            <ul class="bot_submenu"></ul></div><!-- .sidebar-submenu --></li>');
		bots_side.find('.bot_name').text(element['_id']);
				      	bots_side.find('.bot_name_a').attr("title",element["_id"]);
				      	if(element["active"]){
				      		bots_side.find('.onvoff').addClass('online');
				      	}else{
				      		bots_side.find('.onvoff').addClass('offline');
				      	}
				      	bots_side.find(".bot_submenu").html("");//clear menu
				      	//	"createdBuckets":1307,"processedBuckets":282,"crawledPages":12539,"failedPages":0
				      	bots_side.find(".bot_submenu").append('<li><a href="#" class="bot_name_show_total_buckets_'+element["_id"]+'" title="Created Buckets"></span><span>Created Buckets</span><span class="bot_stats_side">'+element['createdBuckets']+'</span></a></li>');
				      	bots_side.find(".bot_submenu").append('<li><a href="#" title="Processed Buckets"><span>Processed Buckets</span><span class="bot_stats_side">'+element['processedBuckets']+'</span></a></li>');
				      	bots_side.find(".bot_submenu").append('<li><a href="#" class="bot_name_show_crawled_pages_'+element["_id"]+'" title="Crawled Pages"><span>Crawled Pages</span><span class="bot_stats_side">'+element['crawledPages']+'</span></a></li>');
				      	bots_side.find(".bot_submenu").append('<li><a href="#" class="bot_name_show_failed_pages_'+element['_id']+'" title="Failed Pages"><span>Failed Pages</span><span class="bot_stats_side">'+element['failedPages']+'</span></a></li>');
				      	bots_side.find(".bot_submenu").append('<li><a href="#" class="bot_name_edit_config_'+element['_id']+'" title="Settings"><span>Bot Config</span><span class="bot_stats_side"></span><i class="glyph-icon icon-linecons-cog sub_glyph"></i></a></li>');
				      	bots_side.find(".bot_submenu").append('<li><a href="#" title="Read Log" class="bot_name_read_log_'+element['_id']+'"><span>Read Log</span><span class="bot_stats_side"></span><i class="glyph-icon icon-file sub_glyph"></i></a></li>');
				      	
				      	bots_side.find(".bot_name_show_total_buckets_"+element["_id"]).on('click',function(){
				      		showTotalBuckets(this,0,10);
				      		return false;
				      	});
				      	bots_side.find(".bot_name_show_crawled_pages_"+element["_id"]).on('click',function(){
				      		showCrawledPages(this,0,10);
				      		return false;
				      	});
				      	bots_side.find(".bot_name_show_failed_pages_"+element["_id"]).on('click',function(){
				      		showFailedPages(this,0,10);
				      		return false;
				      	});
				      	bots_side.find(".bot_name_read_log_"+element["_id"]).on('click',function(){
				      		readLog(this);
				      		return false;
				      	});
				      	bots_side.find(".bot_name_edit_config_"+element["_id"]).on('click',function(){
				      		editConfig(this);
				      		return false;
				      	});
				      	$(".bot-menu-side").append(bots_side);
					      	
					      });
					fn(js[0]);
				   
				});
		}
		function loadClusterLoad(js,fn){
			console.log(js);
			var li=[];
			for (var i = 0; i < js.length; i++) {
				var d={};
				d['value']=js[i]['processedBuckets'];
				d['label']=js[i]['_id'];
				li.push(d);
				d['color']=getRandomColor();
				d['highlight']=getRandomColor();
			};
			console.log(li);
			var b=document.getElementById("chart-area").getContext("2d");
			window.myDoughnut=new Chart(b).Doughnut(li,{responsive:!0});
			fn();
		}
		function loadClusterInfo(fn){
			$.ajax({
				  url: "/ask/q?=cluster-info",
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
				      var b=$('<li class="cluster_info_update"><a class="cluster_name_a" href="javascript:void(0);" title=""><i class="glyph-icon icon-database"></i><span class="cluster_name">'+js['_id']+'</span><span class="small_brackets">(cluster name)</span></a></li><li class="cluster_info_update"><a class="cluster_creation_date_a" href="javascript:void(0);" title=""><i class="glyph-icon icon-calendar"></i><span class="cluster_creation_date">'+new Date(js['createdAt']).toDateString()+'</span><span class="small_brackets">(creation date)</span></a></li><li class="cluster_info_update"><a class="cluster_initiated_by_a" href="javascript:void(0);" title=""><i class="glyph-icon icon-flash"></i><span class="cluster_initiated_by">'+js['initiatedBy']+'</span><span class="small_brackets">(created by)</span></a></li>');
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
			showTable(t,i,j,"processed_buckets","processed-buckets","bot_name_show_processed_buckets_","Processed Buckets by bot :","/ask/q?=get-processed-buckets",function(){return {bot_name:BOT_NAME,i:i,n:j,sort:sort_key,sort_type:sort_type};},showProcessedBuckets,function(data,ii,jj){
				notification("Buckets fetched !","success");
				      var js=JSON.parse(data);
				      console.log(js);
				      var fin=$();
				      if(Object.keys(js)!==0){
				      	for (var i = 0; i < js.length; i++) {
				      		var obj=js[i];
				      		console.log(obj);
				      		var dum=rowGenerator(obj,TABLES[2][3],"bucket");
				      		fin=fin.add(dum);
				      	};
				      	$(".processed_buckets_results").html(fin);
				      	$(".processed_buckets_table_info").text("Showing "+ii+" to "+(ii+jj)+"");
				      	$(".show_processed_buckets").css("display","inline");
					}
			});
		}
		function showFailedPages(t,i,j,sort_key,sort_type){
			showTable(t,i,j,"failed_pages","failed-pages","bot_name_show_failed_pages_","Failed Pages reported by bot :","/ask/q?=get-failed-pages",function(){return {bot_name:BOT_NAME,i:i,n:j,sort:sort_key,sort_type:sort_type};},showFailedPages,function(data,ii,jj){
				notification("Failed pages fetched !","success");
				      var js=JSON.parse(data);
				      var fin=$();
				      if(Object.keys(js)!==0){
				      	for (var i = 0; i < js.length; i++) {
				      		var obj=js[i];
				      		var dum=rowGenerator(obj,TABLES[0][3],"page");
				      		fin=fin.add(dum);
				      	};
				      	$(".failed_pages_results").html(fin);
				      	$(".failed_pages_table_info").text("Showing "+ii+" to "+(ii+jj)+"");
				      	$(".show_failed_pages").css("display","inline");
					}	
				
			});
		}
		function showCrawledPages(t,i,j,sort_key,sort_type){
			showTable(t,i,j,"crawled_pages","crawled-pages","bot_name_show_crawled_pages_","Crawled Pages reported by bot :","/ask/q?=get-crawled-pages",function(){return {bot_name:BOT_NAME,i:i,n:j,sort:sort_key,sort_type:sort_type};},showCrawledPages,function(data,ii,jj){
				notification("Crawled pages fetched !","success");
				      var js=JSON.parse(data);
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
				      	$(".crawled_pages_table_info").text("Showing "+ii+" to "+(ii+jj)+"");
				      	$(".show_crawled_pages").css("display","inline");
							
				      }
				
			});
		}
		function showTotalBuckets(t,i,j,sort_key,sort_type){
			showTable(t,i,j,"total_buckets","total-buckets","bot_name_show_total_buckets_","Buckets added by bot :","/ask/q?=get-total-buckets",function(){return {bot_name:BOT_NAME,i:i,n:j,sort:sort_key,sort_type:sort_type};},showTotalBuckets,function(data,ii,jj){

				notification("Buckets fetched !","success");
			      var js=JSON.parse(data);
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
			      	$(".total_buckets_table_info").text("Showing "+ii+" to "+(jj+ii)+"");
			      	$(".show_total_buckets").css("display","inline");
						
				}
			});
		}
		function rowGenerator(obj,keys,dialog_type){
			var dum=$();
			for(var i=0;i<keys.length;i++){
				var temp=$('<th class="data_row" rowspan="1" colspan="1"></th>');
				if(keys[i].indexOf(".")>=0){
					//nested object
					var r=keys[i].split('.');
					var o=obj;
					for (var ii = 0; ii < r.length; ii++) {
						o=o[r[ii]];
					};
						temp.text(o);
				}
				else{
						temp.text(obj[keys[i]]);
				}
			
				dum=dum.add(temp);
			}
			var cl="";
			if(dialog_type==="bucket"){
				cl="dialog_type_bucket unique_id_"+obj['_id'];
			}
			else if(dialog_type==="page"){
				cl="dialog_type_page unique_id_"+obj['_id'];
			}
			var t=$('<tr class="'+cl+'"></tr>');
			t.html(dum);
			return t;

		}
		function showTable(bot_name,I_TOTAL_PAGES,LEN_TOTAL_PAGES,table_name,table_name1,replacer,heading,url,data,fn1,fn){

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
				  	fn(data,I_TOTAL_PAGES,LEN_TOTAL_PAGES);
				   
				  });
			$(".pagination_"+table_name).on('click','a',function(){
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
		function editConfig(bot_name){
			$(".main_stat_page").css("display","none");
			$(".back_arrow").css("display","inline");
			$(".extra_pages").css("display","none");
			BOT_NAME=$(bot_name).attr("class").replace("bot_name_edit_config_","");
			$(".title-hero-edit-config").html("<span>Edit the config for bot :</span> <b>"+BOT_NAME+"</b>");
			$.ajax({
				  url: "/ask/q?=get-config",
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
							        height: '200',
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
				  		console.log([prev,Math.abs(js[i])]);
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
		$(".update_json").on('click',function(){
			var editor = ace.edit("myEditor");
			var js=editor.getValue();
			try{
				JSON.parse(js);
			}catch(err){
				notification("Invalid JSON !","error");
				return;
			}
			$.post( "/ask/q?=put-config",{data:js,bot_name:BOT_NAME})
			  .done(function() {
			  	notification("Config updated !","success");
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
				  url: "/ask/q?=read-log",
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
			showCrawledPages(this,0,10);
			return false;
		});
		$(".bot_name_show_failed_pages_master").on('click',function(){
			showFailedPages(this,0,10);
			return false;
		});
		$(".bot_name_show_total_buckets_master").on('click',function(){
			showTotalBuckets(this,0,10);
			return false;
		});
		$(".bot_name_show_processed_buckets_master").on('click',function(){
			showProcessedBuckets(this,0,10);
			return false;
		});
		var AJAX_ERROR_ENCOUNTERED=false;
		$(document).ajaxError(function( event, request, settings ) {
        //When XHR Status code is 0 there is no connection with the server
	        if (request.status == 0 && settings.url.indexOf('/ask/')>=0){ 
	        	AJAX_ERROR_ENCOUNTERED=true;
	           AJAX_ERROR+=1;
	        } 
	        if(AJAX_ERROR>=3){
	        	notification("Disconnected from server. Trying to reconnect . . .",'error');
	        	
	        	
	        }

	    });
	   $(document).ajaxSuccess(function( event, request, settings ) {
        //When XHR Status code is 0 there is no connection with the server
	        if (settings.url.indexOf('/ask/')>=0 && AJAX_ERROR_ENCOUNTERED===true){ 
	        	AJAX_ERROR_ENCOUNTERED=false;
	           AJAX_ERROR=0;
	           notification("Reconnected to server. Connected . . .",'success');
	        } 
	        

	    });
			
		});
})();