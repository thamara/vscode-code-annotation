#include "ros/ros.h"
#include "geometry_msgs/Vector3Stamped.h"
#include "geometry_msgs/Vector3.h"
#include "geometry_msgs/Transform.h"
#include "geometry_msgs/TransformStamped.h"
//#include <tf/transform_datatypes.h>
#include <tf2_geometry_msgs/tf2_geometry_msgs.h>
#include <cmath>

//924-3021
int main(int argc, char **argv){
    ros::init(argc, argv, "new lang tests");
    ros::NodeHandle node;

    float seconds_to_years = .001;
    float five_seconds = 5;
    float five_secs_in_years = seconds_to_years*five_seconds;

}