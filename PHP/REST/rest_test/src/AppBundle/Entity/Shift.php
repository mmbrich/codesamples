<?php

namespace AppBundle\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * Post
 *
 * @ORM\Table()
 * @ORM\Entity
 */
class Shift
{
    /**
     * @var integer
     *
     * @ORM\Column(name="id", type="integer")
     * @ORM\Id
     * @ORM\GeneratedValue(strategy="AUTO")
     */
    private $id;

    /**
     * @var integer
     *
     * @ORM\Column(name="manager_id", type="integer")
     */
    private $manager_id;

    /**
     * @OneToOne(targetEntity="User" inversedBy="shift")
     * @JoinColumn(name="manager_id" reference_column="id"
     */
    private $manager;

    /**
     * @var integer
     *
     * @ORM\Column(name="employee_id", type="integer")
     */
    private $employee_id;

    /**
     * @var string
     *
     * @OneToOne(targetEntity="User" inversedBy="shift")
     * @JoinColumn(name="employee_id" reference_column="id"
     */
    private $employee;

    /**
     * @var float
     *
     * @ORM\Column(name="break", type="float")
     */
    private $break;

    /**
     * @var date
     *
     * @ORM\Column(name="created_at", type="date", nullable=true)
     */
    private $created_at;

    /**
     * @var date
     *
     * @ORM\Column(name="updated_at", type="date", nullable=true)
     */
    private $updated_at;

    /**
     * Get id
     *
     * @return integer 
     */
    public function getId()
    {
        return $this->id;
    }

    /**
     * Set manager_id
     *
     * @param integer $mid
     * @return Shift
     */
    public function setManagerId($mid)
    {
        $this->manager_id = $mid;

        return $this;
    }

    /**
     * Get manager_id
     *
     * @return integer 
     */
    public function getManagerId()
    {
        return $this->manager_id;
    }

    /**
     * Set employee_id
     *
     * @param integer $eid
     * @return Shift
     */
    public function setEmployeeId($eid)
    {
        $this->employee_id = $eid;

        return $this;
    }

    /**
     * Get employee_id
     *
     * @return integer 
     */
    public function getEmployeeId()
    {
        return $this->employee_id;
    }

    /**
     * Set break
     *
     * @param float $break
     * @return Shift
     */
    public function setBreak($break)
    {
        $this->break = $break;

        return $this;
    }

    /**
     * Get break
     *
     * @return float 
     */
    public function getBreak()
    {
        return $this->break;
    }

    /**
     * Set created_at
     *
     * @param string $date
     * @return Shift
     */
    public function setCreatedAt($date)
    {
        $this->created_at = $date;

        return $this;
    }

    /**
     * Get created_at
     *
     * @return string 
     */
    public function getCreatedAt()
    {
        return $this->created_at;
    }

    /**
     * Set updated_at
     *
     * @param string $date
     * @return Shift
     */
    public function setUpdatedAt($date)
    {
        $this->updated_at = $date;

        return $this;
    }

    /**
     * Get updated_at
     *
     * @return string 
     */
    public function getUpdatedAt()
    {
        return $this->updated_at;
    }
}
