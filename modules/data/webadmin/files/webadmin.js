function floodprotection_change() {
	var protection = document.getElementById('floodprotection_checkbox');
	var rate = document.getElementById('floodrate');
	var burst = document.getElementById('floodburst');
	if (protection.checked) {
		rate.removeAttribute('disabled');
		burst.removeAttribute('disabled');
	} else {
		rate.disabled = 'disabled';
		burst.disabled = 'disabled';
	}
}

function make_sortable_table(table) {
	if (table.rows.length >= 1) { // Ensure that the table at least contains a row for the headings
		var headings = table.rows[0].getElementsByTagName("th");
		for (var i = 0; i < headings.length; i++) {
			// This function acts to scope the i variable, so we can pass it off
			// as the column_index, otherwise column_index would just be the max
			// value of i, every single time.
			(function (i) {
				var heading = headings[i];
				if (!heading.classList.contains("ignore-sort")) {
					heading.addEventListener("click", function () { // Bind a click event to the heading
						sort_table(this, i, table, headings);
					});
				}
			})(i);
		}
	}
}

function sort_table(clicked_column, column_index, table, headings) {
	for (var i = 0; i < headings.length; i++) {
		if (headings[i] != clicked_column) {
			headings[i].classList.remove("sorted");
			headings[i].classList.remove("reverse-sorted");
		}
	}
	var reverse = false;
	clicked_column.classList.toggle("reverse");
	if (clicked_column.classList.contains("sorted")) {
		reverse = true;
		clicked_column.classList.remove("sorted");
		clicked_column.classList.add("reverse-sorted");
	} else {
		clicked_column.classList.remove("reverse-sorted");
		clicked_column.classList.add("sorted");
	}

	// This array will contain tuples in the form [(value, row)] where value
	// is extracted from the column to be sorted by
	var rows_and_sortable_value = [];
	for (var i = 1, row; row = table.rows[i]; i++) {
		for (var j = 0, col; col = row.cells[j]; j++) {
			// If we're at the column index we want to sort by
			if (j === column_index) {
				var cell = row.getElementsByTagName("td")[j];
				var value = cell.innerHTML;
				rows_and_sortable_value.push([value, row]);
			}
		}
	}

	rows_and_sortable_value.sort(function (a, b) {
		// If both values are integers, sort by that else as strings
		if (isInt(a[0]) && isInt(b[0])) {
			return a[0] - b[0];
		} else {
			return b[0].localeCompare(a[0]);
		}
	});
	if (reverse) {
		rows_and_sortable_value.reverse();
	}

	var parent = table.rows[1].parentNode;
	for (var i = 0; i < rows_and_sortable_value.length; i++) {
		// Remove the existing entry for the row from the table
		parent.removeChild(rows_and_sortable_value[i][1]);
		// Insert at the first position, before the first child
		parent.insertBefore(rows_and_sortable_value[i][1], parent.firstChild);
	}
}

function isInt(value) {
	return !isNaN(value) && (function (x) {
		return (x | 0) === x;
	})(parseFloat(value))
}

function make_sortable() {
	var tables = document.querySelectorAll("table.sortable");
	for (var i = 0; i < tables.length; i++) {
    	make_sortable_table(tables[i]);
	}
}

function serverlist_init($) {
	function serialize() {
		var text = "";
		$("#servers_tbody > tr").each(function() {
			var host = $(".servers_row_host", $(this)).val();
			var port = $(".servers_row_port", $(this)).val();
			var ssl = $(".servers_row_ssl", $(this)).is(":checked");
			var pass = $(".servers_row_pass", $(this)).val();
			if (host.length == 0) return;
			text += host;
			if (!host.startsWith("unix:")) {
				text += " ";
				if (ssl) text += "+";
				text += port;
			}
			text += " ";
			text += pass;
			text += "\n";
		});
		$("#servers_text").val(text);
	}
	function add_row(host, port, ssl, pass) {
		var row = $("<tr/>");
		function delete_row() {
			row.remove();
			serialize();
		}
		if (NetworkEdit) {
			var disable = host.startsWith("unix:") && !EditUnixSockets;
			row.append(
				$("<td/>").append($("<input/>").attr({"type":"text","disabled":disable})
					.addClass("servers_row_host").val(host)),
				$("<td/>").append($("<input/>").attr({"type":"number","disabled":disable})
					.addClass("servers_row_port").val(port)),
				$("<td/>").append($("<input/>").attr({"type":"checkbox","disabled":disable})
					.addClass("servers_row_ssl").prop("checked", ssl)),
				$("<td/>").append($("<input/>").attr({"type":"text","disabled":disable})
					.addClass("servers_row_pass").val(pass)),
				$("<td/>").append($("<input/>").attr({"type":"button"})
					.val("X").click(delete_row))
			);
		} else {
			row.append(
				$("<td/>").append($("<input/>").attr({"type":"text","disabled":true})
						.addClass("servers_row_host").val(host)),
				$("<td/>").append($("<input/>").attr({"type":"number","disabled":true})
						.addClass("servers_row_port").val(port)),
				$("<td/>").append($("<input/>").attr({"type":"checkbox","disabled":true})
						.addClass("servers_row_ssl").prop("checked", ssl)),
				$("<td/>").append($("<input/>").attr({"type":"text","disabled":true})
						.addClass("servers_row_pass").val(pass))
			);
		}
		$("input", row).change(serialize);
		$("input.servers_row_host", row).change(function (ev) {
			var host = ev.target.value;
			if (host.startsWith("unix:")) {
				$("input.servers_row_ssl", row)[0].checked = host.startsWith("unix:ssl:");
			}
		});
		$("input.servers_row_ssl", row).change(function (ev) {
			var host = $("input.servers_row_host", row).val();
			if (host.startsWith("unix:")) {
				if (ev.target.checked != host.startsWith("unix:ssl:")) {
					if (host.startsWith("unix:ssl:")) {
						host = host.substr(9);
					} else {
						host = host.substr(5);
					}
					$("input.servers_row_host", row).val("unix:" + (ev.target.checked ? "ssl:" : "") + host);
				}
			}
		});
		$("#servers_tbody").append(row);
	}

	(function() {
		var servers_text = $("#servers_text").val();
		// Parse it
		$.each(servers_text.split("\n"), function(i, line) {
			if (line.length == 0) return;
			line = line.split(" ");
			var host = line[0];
			var unix = host.startsWith("unix:");
			var port = "0";
			var pass = line[unix ? 1 : 2] || "";
			var ssl = false;
			if (unix) {
				if (host.startsWith("unix:ssl:")) {
					ssl = true;
				}
			} else {
				port = line[1] || "6667";
				if (port.match(/^\+/)) {
					ssl = true;
					port = port.substr(1);
				}
			}
			add_row(host, port, ssl, pass);
		});
		$("#servers_add").click(function() {
			add_row("", 6697, true, "");
			// Not serializing, because empty host doesn't emit anything anyway
		});

		$("#servers_plain").hide();
		$("#servers_js").show();
	})();
}

function channellist_init($) {
    function update_rows() {
        $("#channels > tr").each(function(i) {
            $(this).toggleClass("evenrow", i % 2 === 1).toggleClass("oddrow", i % 2 === 0);
            $(this).find(".channel_index").val(i + 1);
        });
    }
    $("#channels").sortable({
        axis: "y",
        update: update_rows
    });
    $(".channel_index").change(function() {
        var src = $(this).closest("tr").detach();
        var rows = $("#channels > tr");
        var dst = rows[this.value - 1];

        if (dst)
            src.insertBefore(dst);
        else
            src.insertAfter(rows.last());

        update_rows();
    });
}

function ctcpreplies_init($) {
	function serialize() {
		var text = "";
		$("#ctcpreplies_tbody > tr").each(function() {
			var request = $(".ctcpreplies_row_request", $(this)).val();
			var response = $(".ctcpreplies_row_response", $(this)).val();
			if (request.length == 0) return;
			text += request;
			text += " ";
			text += response;
			text += "\n";
		});
		$("#ctcpreplies_text").val(text);
	}
	function add_row(request, response) {
		var row = $("<tr/>");
		function delete_row() {
			row.remove();
			serialize();
		}
		if (CTCPEdit) {
			row.append(
				$("<td/>").append($("<input/>").val(request)
					.addClass("ctcpreplies_row_request")
					.attr({"type":"text","list":"ctcpreplies_list"})),
				$("<td/>").append($("<input/>").val(response)
					.addClass("ctcpreplies_row_response")
					.attr({"type":"text","placeholder":$("#ctcpreplies_js").data("placeholder")})),
				$("<td/>").append($("<input/>").val("X")
					.attr({"type":"button"}).click(delete_row))
			);
		} else {
			row.append(
				$("<td/>").append($("<input/>").val(request)
					.addClass("ctcpreplies_row_request")
					.attr({"type":"text","list":"ctcpreplies_list","disabled":true})),
				$("<td/>").append($("<input/>").val(response)
					.addClass("ctcpreplies_row_response")
					.attr({"type":"text","placeholder":$("#ctcpreplies_js").data("placeholder"),"disabled":true})),
			);
		}
		$("input", row).change(serialize);
		$("#ctcpreplies_tbody").append(row);
	}

	(function() {
		var replies_text = $("#ctcpreplies_text").val();
		$.each(replies_text.split("\n"), function(i, line) {
			if (line.length == 0) return;
			var space = line.indexOf(" ");
			var request;
			var response;
			if (space == -1) {
				request = line;
				response = "";
			} else {
				request = line.substr(0, space);
				response = line.substr(space + 1);
			}
			add_row(request, response);
		});
		$("#ctcpreplies_add").click(function() {
			add_row("", "");
		});

		$("#ctcpreplies_plain").hide();
		$("#ctcpreplies_js").show();
	})();
}
