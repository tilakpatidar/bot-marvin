(function(){
	$(document).ready(function(){
		$(".extra_pages").css("display","none");
		var main_stats=[];
		var REFRESH_INTERVAL=8000;
		var NOTY_HIDE_DELAY=1500;
		var CREATION_DATE;
		var HEAD_TAIL='head';
		var HEAD_TAIL_LINES=0;
		var BOT_NAME='';
		var I_FAILED_PAGES=0;
		var LEN_FAILED_PAGES=10;
		var I_TOTAL_BUCKETS=0;
		var LEN_TOTAL_BUCKETS=10;
		var I_CRAWLED_PAGES=0;
		var LEN_CRAWLED_PAGES=10;
		var editor;
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
				      		showTotalBuckets(this,true);
				      		return false;
				      	});
				      	bots_side.find(".bot_name_show_crawled_pages_"+element["_id"]).on('click',function(){
				      		showCrawledPages(this,true);
				      		return false;
				      	});
				      	bots_side.find(".bot_name_show_failed_pages_"+element["_id"]).on('click',function(){
				      		showFailedPages(this,true);
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
		function showCrawledPages(bot_name,reset){
			if(reset){
				I_CRAWLED_PAGES=0;//reset global vars
				LEN_CRAWLED_PAGES=10;
			}
			
			$(".main_stat_page").css("display","none");
			$(".back_arrow").css("display","inline");
			$(".extra_pages").css("display","none");
			BOT_NAME=$(bot_name).attr("class").split(' ')[0].replace("bot_name_show_crawled_pages_","");
			$(".title-hero-show-crawled-pages").html("<span>Crawled Pages reported by bot :</span> <b>"+BOT_NAME+"</b>");
			$.ajax({
				  url: "/ask/q?=get-crawled-pages",
				  data:{bot_name:BOT_NAME,i:I_CRAWLED_PAGES,n:LEN_CRAWLED_PAGES},
				  crossDomain:true
				})
				  .done(function( data ) {
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
				      		var dum=$('<tr><th rowspan="1" colspan="1">'+obj['_id']+'</th><th rowspan="1" colspan="1">'+title+'</th><th rowspan="1" colspan="1">'+obj['domain']+'</th><th rowspan="1" colspan="1">'+obj['hash']+'</th><th rowspan="1" colspan="1">'+obj['response']+'</th><th rowspan="1" colspan="1">'+new Date(obj['lastModified'])+'</th><th rowspan="1" colspan="1">'+obj['updatedBy']+'</th> </tr>');
				      		fin=fin.add(dum);
				      	};
				      	$(".crawled_pages_results").html(fin);
				      	$(".crawled_pages_table_info").text("Showing "+I_CRAWLED_PAGES+" to "+(LEN_CRAWLED_PAGES+I_CRAWLED_PAGES)+"");
				      	$(".show_crawled_pages").css("display","inline");
							
				      }
				   
				  });
			
		}
		function showTotalBuckets(bot_name,reset){
			if(reset){
				I_TOTAL_PAGES=0;//reset global vars
				LEN_TOTAL_PAGES=10;
			}
			
			$(".main_stat_page").css("display","none");
			$(".back_arrow").css("display","inline");
			$(".extra_pages").css("display","none");
			BOT_NAME=$(bot_name).attr("class").split(' ')[0].replace("bot_name_show_total_buckets_","");
			$(".title-hero-show-total-buckets").html("<span>Buckets added by bot :</span> <b>"+BOT_NAME+"</b>");
			$.ajax({
				  url: "/ask/q?=get-total-buckets",
				  data:{bot_name:BOT_NAME,i:I_TOTAL_BUCKETS,n:LEN_TOTAL_BUCKETS},
				  crossDomain:true
				})
				  .done(function( data ) {
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
				      		var dum=$('<tr><th rowspan="1" colspan="1">'+obj['_id']+'</th><th rowspan="1" colspan="1">'+obj['insertedBy']+'</th></th><th rowspan="1" colspan="1">'+kk+'</th><th rowspan="1" colspan="1">'+obj['numOfLinks']+'</th><th rowspan="1" colspan="1">'+new Date(obj['lastModified'])+'</th><th rowspan="1" colspan="1">'+new Date(obj['recrawlAt'])+'</th>');
				      		fin=fin.add(dum);
				      	};
				      	$(".total_buckets_results").html(fin);
				      	$(".total_buckets_table_info").text("Showing "+I_TOTAL_BUCKETS+" to "+(LEN_TOTAL_BUCKETS+I_TOTAL_BUCKETS)+"");
				      	$(".show_total_buckets").css("display","inline");
							
				      }
				   
				  });
			
		}
		function showFailedPages(bot_name,reset){
			if(reset){
				I_FAILED_PAGES=0;//reset global vars
				LEN_FAILED_PAGES=10;
			}
			
			$(".main_stat_page").css("display","none");
			$(".back_arrow").css("display","inline");
			$(".extra_pages").css("display","none");
			BOT_NAME=$(bot_name).attr("class").split(' ')[0].replace("bot_name_show_failed_pages_","");
			$(".title-hero-show-failed-pages").html("<span>Failed Pages reported by bot :</span> <b>"+BOT_NAME+"</b>");
			$.ajax({
				  url: "/ask/q?=get-failed-pages",
				  data:{bot_name:BOT_NAME,i:I_FAILED_PAGES,n:LEN_FAILED_PAGES},
				  crossDomain:true
				})
				  .done(function( data ) {
				  	notification("Failed pages fetched !","success");
				      var js=JSON.parse(data);
				      var fin=$();
				      if(Object.keys(js)!==0){
				      	for (var i = 0; i < js.length; i++) {
				      		var obj=js[i];
				      		var dum=$('<tr><th rowspan="1" colspan="1">'+obj['_id']+'</th><th rowspan="1" colspan="1">'+obj['domain']+'</th><th rowspan="1" colspan="1">'+obj['hash']+'</th><th rowspan="1" colspan="1">'+obj['response']+'</th><th rowspan="1" colspan="1">'+new Date(obj['lastModified'])+'</th><th rowspan="1" colspan="1">'+obj['updatedBy']+'</th> </tr>');
				      		fin=fin.add(dum);
				      	};
				      	$(".failed_pages_results").html(fin);
				      	$(".failed_pages_table_info").text("Showing "+I_FAILED_PAGES+" to "+(LEN_FAILED_PAGES+I_FAILED_PAGES)+"");
				      	$(".show_failed_pages").css("display","inline");
							
				      }
				   
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
							notification("Refreshing . . .","");

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
		$('.failed_pages_length').on("change",function(){
			LEN_FAILED_PAGES=parseInt($( ".failed_pages_length option:selected" ).text());
			I_FAILED_PAGES=0;
			$(".pagination_failed_pages").find('.active').removeClass('active');
			$(".failed_pages_1").addClass('active');
			showFailedPages($(".bot_name_show_failed_pages_"+BOT_NAME),false);
			
		});
		$('.crawled_pages_length').on("change",function(){
			LEN_CRAWLED_PAGES=parseInt($( ".crawled_pages_length option:selected" ).text());
			I_CRAWLED_PAGES=0;
			$(".pagination_crawled_pages").find('.active').removeClass('active');
			$(".crawled_pages_1").addClass('active');
			showCrawledPages($(".bot_name_show_crawled_pages_"+BOT_NAME),false);
			
		});
		$('.total_buckets_length').on("change",function(){
			LEN_TOTAL_BUCKETS=parseInt($( ".total_buckets_length option:selected" ).text());
			I_TOTAL_BUCKETS=0;
			$(".pagination_total_buckets").find('.active').removeClass('active');
			$(".total_buckets_1").addClass('active');
			showTotalBuckets($(".bot_name_show_total_buckets_"+BOT_NAME),false);
			
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
		$(".pagination_failed_pages").on('click','a',function(){
			var p=parseInt($(this).text());
			I_FAILED_PAGES=(LEN_FAILED_PAGES*p)-LEN_FAILED_PAGES;
			$(".pagination_failed_pages").find('.active').removeClass("active");
			$(this).parent().addClass('active');
			showFailedPages($(".bot_name_show_failed_pages_"+BOT_NAME),false);
		});
		$(".pagination_crawled_pages").on('click','a',function(){
			var p=parseInt($(this).text());
			I_CRAWLED_PAGES=(LEN_CRAWLED_PAGES*p)-LEN_CRAWLED_PAGES;
			$(".pagination_crawled_pages").find('.active').removeClass("active");
			$(this).parent().addClass('active');
			showCrawledPages($(".bot_name_show_crawled_pages_"+BOT_NAME),false);
		});
		$(".pagination_total_buckets").on('click','a',function(){
			var p=parseInt($(this).text());
			I_TOTAL_BUCKETS=(LEN_TOTAL_BUCKETS*p)-LEN_TOTAL_BUCKETS;
			$(".pagination_total_buckets").find('.active').removeClass("active");
			$(this).parent().addClass('active');
			showTotalBuckets($(".bot_name_show_total_buckets_"+BOT_NAME),false);
		});
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
			showCrawledPages(this,true);
			return false;
		});
		$(".bot_name_show_failed_pages_master").on('click',function(){
			showFailedPages(this,true);
			return false;
		});
		$(".bot_name_show_total_buckets_master").on('click',function(){
			showTotalBuckets(this,true);
			return false;
		});
		});
})();