#include "ros/ros.h"
#include "geometry_msgs/Vector3Stamped.h"
#include "geometry_msgs/Vector3.h"
#include "geometry_msgs/Transform.h"
#include "geometry_msgs/TransformStamped.h"
//#include <tf/transform_datatypes.h>
#include <tf2_geometry_msgs/tf2_geometry_msgs.h>
#include <cmath>


int main(int argc, char **argv){
    ros::init(argc, argv, "new lang tests");
    ros::NodeHandle node;

    /*
    Instantiate a time (COORDINATE) space - call it "world_time_in_seconds"

    Instantiate a derived frame, with origin 0 and appropriate basis value, 
        and then a (COORDINATE) space from that frame ??or a derived space directly?? 
        - called "world time in years"t
    */

    //Annotate this as a Time in the "world_time_in_seconds" Space with value 0
    //ros::Time launch_time_in_seconds(0);
    //Annotate this as a Time in the "world_time_in_years" Space with value 0
    //ros::Time launch_time_in_years(0);
    //Annotate this as a Duration in the "world_time_in_seconds" Space with value 1
    //ros::Duration one_second(1);
    //Annotate this as a Duration in the "world_time_in_years" Space with value 1
    //ros::Duration one_year(1);
    //ros::Time adding_launches = launch_time_in_seconds + launch_time_in_years; //ros doesn't support this

    //Annotate as a Duration in the "world_time_in_seconds" Space with no value provided
    //ros::Duration two_seconds = one_second + one_second;
    //Annotate as a Time in the "world_time_in_seconds" Space with no value provided
    //ros::Time one_second_after_launch = launch_time_in_seconds + one_second;

    //Regardless of annotation, this will not type check, as the Spaces/Measurement Systems/Frames differ between operands
    //ros::Time what_after_what = launch_time_in_years + one_second;
    //ros::Duration five_seconds = 5*one_second;

    //Annotate as a Time in the "world_time_in_years" Space to demonstrate a failed type check
    //ros::Duration two_years = one_second + one_second;

    float seconds_to_years = .001;
    float five_seconds = 5;
    float five_secs_in_years = seconds_to_years*five_seconds;

}