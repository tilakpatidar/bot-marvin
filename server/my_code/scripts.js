(function(){
	$(document).ready(function(){
		var main_stats=[];
		var REFRESH_INTERVAL=8000;
		var NOTY_HIDE_DELAY=1500;
		var CREATION_DATE;
		function notification(type,msg){
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
				      	bots_side.find(".bot_submenu").append('<li><a href="helper-classes.html" title="Created Buckets"></span><span>Created Buckets</span><span class="bot_stats_side">'+element['createdBuckets']+'</span></a></li>');
				      	bots_side.find(".bot_submenu").append('<li><a href="helper-classes.html" title="Processed Buckets"><span>Processed Buckets</span><span class="bot_stats_side">'+element['processedBuckets']+'</span></a></li>');
				      	bots_side.find(".bot_submenu").append('<li><a href="helper-classes.html" title="Crawled Pages"><span>Crawled Pages</span><span class="bot_stats_side">'+element['crawledPages']+'</span></a></li>');
				      	bots_side.find(".bot_submenu").append('<li><a href="helper-classes.html" title="Failed Pages"><span>Failed Pages</span><span class="bot_stats_side">'+element['failedPages']+'</span></a></li>');
				      	bots_side.find(".bot_submenu").append('<li><a href="helper-classes.html" title="Settings"><span>Bot Config</span><span class="bot_stats_side"></span><i class="glyph-icon icon-linecons-cog sub_glyph"></i></a></li>');
				      	bots_side.find(".bot_submenu").append('<li><a href="#" title="Read Log" class="bot_name_read_log_'+element['_id']+'"><span>Read Log</span><span class="bot_stats_side"></span><i class="glyph-icon icon-file sub_glyph"></i></a></li>');
				      	
				      	bots_side.find(".bot_name_read_log_"+element["_id"]).on('click',function(){
				      		readLog(this);
				      	});
				      	$(".bot-menu-side").append(bots_side);
					      	
					      });
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
				      		window.location=window.location;//refresh page
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
		function readLog(bot_name){

			$(".main_stat_page").css("display","none");
			$(".back_arrow").css("display","inline");

			var bot_name=$(bot_name).attr("class").replace("bot_name_read_log_","");
			$(".title-hero-read-log").html("<span>Read the log data for bot :</span> <b>"+bot_name+"</b>");
			$(".read_log").css("display","inline"); 
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
							notification("","Refreshing . . .");

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
		})
		
	});
})();