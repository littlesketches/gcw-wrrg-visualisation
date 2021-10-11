# Waste data interface: 

The code in this repository is for a web application that is live publshed by Github pages [here](https://littlesketches.github.io/gcw-wrrg-visualisation/)

## About
This repository contains a small web-based application for viewing the volume of waste flows in the Grampians Central West Waste and Resource Recovery Group (GCW WRRG) region. It acts an an interface for a dataset of waste volume data that is collected and published by GCW WRRG as a series of (text file-based) data tables that are connected to this application. The interface allows for the following configurations via dropdown boxes in he upper title block:
- By region/LGA with the default being 'all LGAs in teh CGW' region
- By year 
- By material

These combinations are supported by GCW WRRG data and data (breakdowns) that feed into the tool.  

<br>


## Using and updating the data
The data tables that support the application are in tabular dataset that are setup in a spreadsheet program like Excel or Google Sheets. Instead of an .xls or .gsheet. file howeever, the data file format used are 'tab separated values' (.tsv), which are similar to 'comma-separated values' (.csv) files, but avoid issues with having commas in data labels and descriptions.

The primary reason for using text-based data files is that they are non-proprietary and can be transferred via the web to the application, by simply providing a URL for each data table used. The location of the data table is either: 
- From the /data folder of the application itself (i.e. hosted with the application); or 
- From the Google Sheets native web service that can publish a URL for each page of a Google Sheet: the major advantage of this option is that those with access to the source Google Sheet.  

The data tables for application are also interchangeable by simply changing the reference URLs in the main.js file. This may useful for testing a 'new dataset' before making changes to the 'live' version (e.g in a separate test/development version of the tool).

Data and content for can simply be updated, amended or appended as long as they observe the same data structure formats

<br>

## The data tables and their configuration options
The current Google Sheet used for the tool datasets can be found [here](https://docs.google.com/spreadsheets/u/1/d/1KXgOpNskRQ5lINHhAex-mC1yZou3hkiO6WnWVOhcMcI/edit#gid=1665717612]). There are currently three data tables that are used by the application: 

1. **data_flows** contains the volumetric data 'from' and 'to' each step in (node) in the waste collection > management > product/disposal chain. Data here is 
    - by 'year' 
    - by 'region': an LGA or 'all LGAs in GCW'
    - and values are in separate columns of 'all materials' and then any material type breakdown that is required (as individual columns). Importantly, these material types represent a breakdown of the 'all materials' column: they can be amended/added to and they should then appear in the application as an option al view.

        Note: There fields for 'stemLength1' and 'stemLength2' are used to control the shape of each link in the visualisation (i.e the (proportional) length of the straight parts at the start and end of each link.). The 'rankIn' field is used to set the order of (multiple) links where they connect to the same node (i.e. to reduce /avoid unnecessary overlapping). In general, these settings should not need to be changed.


2.  **data_nodes** contains a list of all waste collection stream, management and product/disposal steps used in the data visualisation. It also contains layout, styling and text content used in the application
    - **nodeNameShort** is an optional field for including a more concise label in the visual. If blank, the **nodeName** is used
    - **type** is used as a class name in the visualisation code (which also controls the link colours via CSS classes)
    - **colourCSS** is a (CSS) colour code that can be used to change the colour of each node. 
    - **xPos and yPos** are variables used to position the nodes in the layout. Note: the x and y axis were originally set for a vertical diagram and so the axis for these position variables is transposed for the default horizontal layout. In general however, these will not need to be changed (and if they are, adjustments will probably need ot be made to the link layout configuration fields)
    - **modalContent** contains any text information that might be relevant for that node. This can/should be written in HTML (i.e. with HTML tags) if formatting is required (e.g. for paragraphs etc.)
    - **embeddedURL** contains a URL for embedded content that is placed in an iframe in the modal window, e.g. a PowerBI link

- Data and content for can simply be updated, amended or appended as long as they observe the same data structure formats

3. **schema_lga** is a table that simply holds information about Victorian LGAs, assignments to WRRGs and various GIS identification fields. It is used to set the 'correct' LGA names in the tool, but is mostly placeholder/meta data in case a map is included in the interface in the future, or the application is late expanded to other WRRGs.

> Importantly, data schema such node (waste management) names, LGA and material names, **must** be consistent across all datasets.  
> New nodes and links can be added directly via the data tables, however their layout configuration options can be quite difficult to understand: and understanding of the data structures and how the "node and link" are related is strongly recommended.   

<br>

## A note more about embedding of PowerBI dashboards
The interface currently allows for a PowerBI dashboard to be included in the detailed 'modal window' that appears when a 'waste node' is clicked on by the user. Having a PowerBI dashboard is optional for a node. However at present, only one PowerBI URL can be assigned to a node (i.e. this is independent of the the interface options for region, year and material). In general - because there's no ability to 'query' a PowerBI dashboard with the interfaces view/settings - more generic PowerBI dashboards are recommended to avoid confusion etc.


